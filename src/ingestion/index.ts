import fs from "node:fs/promises";
import { ChromaClient, type Collection, type Where } from "chromadb";
import { env } from "../config/env.js";
import { loadCorpus } from "../lib/corpus.js";
import { getEmbeddingFunction } from "../lib/embeddings.js";
import {
  activeIndexPath,
  chunksPath,
  INDEX_DIR,
  metadataIndexPath,
} from "../lib/paths.js";
import type {
  ActiveIndexPointer,
  ChunkRecord,
  QueryIndexResult,
  SchemeMetadata,
} from "../lib/types.js";
import { readFetchMeta } from "./fetch.js";

const DEFAULT_COLLECTION = "corpus_active";

function createChromaClient(): ChromaClient {
  const url = new URL(env.chromaHost);
  const port = url.port
    ? Number(url.port)
    : url.protocol === "https:"
      ? 443
      : 8000;

  return new ChromaClient({
    host: url.hostname,
    port,
    ssl: url.protocol === "https:",
  });
}

async function assertChromaReachable(client: ChromaClient): Promise<void> {
  try {
    await client.heartbeat();
  } catch {
    throw new Error(
      `Chroma server unreachable at ${env.chromaHost}. Start it with: npm run chroma:server`,
    );
  }
}

function chunkSlug(chunk: ChunkRecord): string {
  return chunk.id.split("#")[0] ?? chunk.id;
}

function chunkToMetadata(
  chunk: ChunkRecord,
): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {
    slug: chunkSlug(chunk),
    scheme_name: chunk.scheme_name,
    source_url: chunk.source_url,
    section: chunk.section,
    last_updated: chunk.last_updated,
    token_estimate: chunk.token_estimate,
  };

  if (chunk.manager_name) {
    metadata.manager_name = chunk.manager_name;
  }

  return metadata;
}

export async function loadAllChunks(): Promise<ChunkRecord[]> {
  const corpus = loadCorpus();
  const chunks: ChunkRecord[] = [];

  for (const scheme of corpus.schemes) {
    const raw = await fs.readFile(chunksPath(scheme.slug), "utf8");
    chunks.push(...(JSON.parse(raw) as ChunkRecord[]));
  }

  return chunks;
}

export async function buildMetadataIndex(): Promise<SchemeMetadata[]> {
  const corpus = loadCorpus();
  const metadata: SchemeMetadata[] = [];

  for (const scheme of corpus.schemes) {
    let lastFetchedAt = new Date().toISOString().slice(0, 10);
    try {
      const fetchMeta = await readFetchMeta(scheme.slug);
      lastFetchedAt = fetchMeta.fetched_at.slice(0, 10);
    } catch {
      // Fall back to today's date when raw fetch metadata is unavailable.
    }

    metadata.push({
      slug: scheme.slug,
      scheme_name: scheme.scheme_name,
      category: scheme.category,
      source_url: scheme.source_url,
      aliases: scheme.aliases,
      last_fetched_at: lastFetchedAt,
    });
  }

  await fs.mkdir(INDEX_DIR, { recursive: true });
  await fs.writeFile(metadataIndexPath(), JSON.stringify(metadata, null, 2), "utf8");
  return metadata;
}

export async function readActivePointer(): Promise<ActiveIndexPointer | null> {
  try {
    const raw = await fs.readFile(activeIndexPath(), "utf8");
    return JSON.parse(raw) as ActiveIndexPointer;
  } catch {
    return null;
  }
}

async function writeActivePointer(collection: string): Promise<void> {
  const pointer: ActiveIndexPointer = {
    collection,
    updated_at: new Date().toISOString(),
  };
  await fs.mkdir(INDEX_DIR, { recursive: true });
  await fs.writeFile(activeIndexPath(), JSON.stringify(pointer, null, 2), "utf8");
}

async function getActiveCollection(
  client: ChromaClient,
): Promise<Collection | null> {
  const pointer = await readActivePointer();
  if (!pointer) return null;

  try {
    return await client.getCollection({
      name: pointer.collection,
      embeddingFunction: getEmbeddingFunction(),
    });
  } catch {
    return null;
  }
}

async function upsertChunks(
  collection: Collection,
  chunks: ChunkRecord[],
): Promise<void> {
  await collection.upsert({
    ids: chunks.map((chunk) => chunk.id),
    documents: chunks.map((chunk) => chunk.text),
    metadatas: chunks.map(chunkToMetadata),
  });
}

async function deleteStaleIds(
  collection: Collection,
  currentIds: Set<string>,
): Promise<number> {
  const existing = await collection.get({});
  const staleIds = existing.ids.filter((id) => !currentIds.has(id));

  if (staleIds.length > 0) {
    await collection.delete({ ids: staleIds });
  }

  return staleIds.length;
}

export async function reindexInPlace(
  chunks: ChunkRecord[],
): Promise<{ collection: string; count: number; removed: number }> {
  const client = createChromaClient();
  await assertChromaReachable(client);

  const embeddingFunction = getEmbeddingFunction();
  const pointer = await readActivePointer();
  const collectionName = pointer?.collection ?? DEFAULT_COLLECTION;

  const collection = await client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction,
    metadata: { purpose: "mutual-fund-faq" },
  });

  await upsertChunks(collection, chunks);
  const removed = await deleteStaleIds(collection, new Set(chunks.map((c) => c.id)));
  await writeActivePointer(collectionName);

  const count = await collection.count();
  return { collection: collectionName, count, removed };
}

export async function swapCollectionIndex(
  chunks: ChunkRecord[],
): Promise<{ collection: string; count: number }> {
  const client = createChromaClient();
  await assertChromaReachable(client);

  const embeddingFunction = getEmbeddingFunction();
  const newCollectionName = `corpus_${Date.now()}`;
  const oldPointer = await readActivePointer();

  const collection = await client.createCollection({
    name: newCollectionName,
    embeddingFunction,
    metadata: { purpose: "mutual-fund-faq" },
  });

  await upsertChunks(collection, chunks);
  await writeActivePointer(newCollectionName);

  const collections = await client.listCollections();
  for (const existing of collections) {
    if (
      existing.name.startsWith("corpus_") &&
      existing.name !== newCollectionName
    ) {
      try {
        await client.deleteCollection({ name: existing.name });
      } catch {
        // Ignore cleanup failures for already-removed collections.
      }
    }
  }

  void oldPointer;
  const count = await collection.count();
  return { collection: newCollectionName, count };
}

export async function queryIndex(args: {
  queryText: string;
  where?: Where;
  nResults?: number;
}): Promise<QueryIndexResult> {
  const client = createChromaClient();
  await assertChromaReachable(client);

  const collection = await getActiveCollection(client);
  if (!collection) {
    throw new Error("No active Chroma collection. Run indexing first.");
  }

  const result = await collection.query({
    queryTexts: [args.queryText],
    nResults: args.nResults ?? 3,
    where: args.where,
    include: ["documents", "metadatas", "distances"],
  });

  return {
    ids: result.ids[0] ?? [],
    documents: (result.documents[0] ?? []).filter(Boolean) as string[],
    metadatas: (result.metadatas[0] ?? []).filter(Boolean) as Record<
      string,
      string | number | boolean
    >[],
    distances: (result.distances[0] ?? []).filter(
      (d): d is number => d !== null,
    ),
  };
}

export type IndexValidationResult = {
  ok: boolean;
  errors: string[];
  count: number;
};

export async function validateIndex(): Promise<IndexValidationResult> {
  const errors: string[] = [];
  const client = createChromaClient();

  try {
    await assertChromaReachable(client);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
      count: 0,
    };
  }

  const collection = await getActiveCollection(client);
  if (!collection) {
    return { ok: false, errors: ["No active Chroma collection"], count: 0 };
  }

  const count = await collection.count();
  if (count < 40 || count > 150) {
    errors.push(`Expected 40-150 indexed chunks, got ${count}`);
  }

  try {
    const metadata = JSON.parse(
      await fs.readFile(metadataIndexPath(), "utf8"),
    ) as SchemeMetadata[];

    if (metadata.length !== 5) {
      errors.push(`Expected 5 schemes in metadata.json, got ${metadata.length}`);
    }

    for (const scheme of metadata) {
      if (!scheme.source_url.startsWith("https://groww.in/mutual-funds/")) {
        errors.push(`${scheme.slug}: invalid source_url`);
      }
    }
  } catch {
    errors.push("metadata.json is missing or invalid");
  }

  const probes = [
    {
      query: "expense ratio mid cap",
      slugIncludes: "mid-cap",
      section: "expense_ratio",
    },
    {
      query: "fund manager defence",
      slugIncludes: "defence",
      section: "fund_management",
    },
  ] as const;

  for (const probe of probes) {
    try {
      const result = await queryIndex({ queryText: probe.query, nResults: 1 });
      const meta = result.metadatas[0];
      if (!meta) {
        errors.push(`No result for probe query: "${probe.query}"`);
        continue;
      }

      if (meta.section !== probe.section) {
        errors.push(
          `Probe "${probe.query}" expected section ${probe.section}, got ${String(meta.section)}`,
        );
      }

      const slug = String(meta.slug ?? "");
      if (!slug.includes(probe.slugIncludes)) {
        errors.push(
          `Probe "${probe.query}" expected slug containing "${probe.slugIncludes}", got "${slug}"`,
        );
      }
    } catch (error) {
      errors.push(
        `Probe "${probe.query}" failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { ok: errors.length === 0, errors, count };
}

export async function runIndexing(options?: {
  swap?: boolean;
}): Promise<{ collection: string; count: number }> {
  const chunks = await loadAllChunks();
  await buildMetadataIndex();

  if (options?.swap) {
    return swapCollectionIndex(chunks);
  }

  const result = await reindexInPlace(chunks);
  return { collection: result.collection, count: result.count };
}
