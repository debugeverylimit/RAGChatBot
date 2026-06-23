import { chunkAllSchemes, validateAllChunks } from "./chunk.js";
import { fetchAllSchemes } from "./fetch.js";
import { runIndexing, validateIndex } from "./index.js";
import { parseAllSchemes } from "./parse.js";
import { loadCorpus } from "../lib/corpus.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

export type IngestionOptions = {
  skipFetch?: boolean;
  indexOnly?: boolean;
  skipIndex?: boolean;
  swapIndex?: boolean;
};

export type IngestionResult = {
  fetched: number;
  parsed: number;
  chunks: number;
  indexed?: number;
  collection?: string;
};

function parseArgs(argv: string[]): IngestionOptions {
  return {
    skipFetch: argv.includes("--skip-fetch"),
    indexOnly: argv.includes("--index-only"),
    skipIndex: argv.includes("--skip-index"),
    swapIndex: argv.includes("--swap-index"),
  };
}

async function indexAndValidate(swapIndex: boolean): Promise<{
  count: number;
  collection: string;
}> {
  console.log("\n=== Indexing (Phase 2) ===\n");
  const indexResult = await runIndexing({ swap: swapIndex });
  console.log(
    `Indexed ${indexResult.count} chunks into collection "${indexResult.collection}".`,
  );

  const indexValidation = await validateIndex();
  console.log(`Index validation: ${indexValidation.count} vectors in store`);
  if (!indexValidation.ok) {
    const message = indexValidation.errors.join("; ");
    throw new Error(`Index validation failed: ${message}`);
  }
  console.log("Index validation passed.");
  return indexResult;
}

export async function runIngestion(
  options: IngestionOptions = {},
): Promise<IngestionResult> {
  if (options.indexOnly) {
    console.log("=== Index only (Phase 2) ===\n");
    const indexResult = await indexAndValidate(Boolean(options.swapIndex));
    return {
      fetched: 0,
      parsed: 0,
      chunks: 0,
      indexed: indexResult.count,
      collection: indexResult.collection,
    };
  }

  console.log("=== Mutual Fund FAQ Ingestion ===\n");

  let fetched = 0;
  let fetchFailures = 0;
  if (!options.skipFetch) {
    const fetchResult = await fetchAllSchemes();
    fetched = fetchResult.length;
    fetchFailures = loadCorpus().schemes.length - fetched;
    console.log(`\nIngestion fetch summary: ${fetched} pages saved, ${fetchFailures} failed.\n`);
  } else {
    console.log("Skipping fetch (--skip-fetch).\n");
  }

  const parsed = await parseAllSchemes();
  console.log(`\nParsed ${parsed.length} schemes.\n`);

  const chunks = await chunkAllSchemes(parsed);
  console.log(`\nCreated ${chunks.length} chunks.\n`);

  const validation = await validateAllChunks();
  console.log("Chunk validation summary:");
  for (const [slug, count] of Object.entries(validation.byScheme)) {
    console.log(`  ${slug}: ${count} chunks`);
  }
  console.log(`  Total: ${validation.totalChunks} chunks`);

  if (!validation.ok) {
    throw new Error(`Chunk validation failed: ${validation.errors.join("; ")}`);
  }

  let indexed: number | undefined;
  let collection: string | undefined;
  if (!options.skipIndex) {
    const indexResult = await indexAndValidate(Boolean(options.swapIndex));
    indexed = indexResult.count;
    collection = indexResult.collection;
  }

  console.log("\nIngestion completed successfully.");
  return {
    fetched,
    parsed: parsed.length,
    chunks: chunks.length,
    indexed,
    collection,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await runIngestion(args);
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("Ingestion failed:", error);
    process.exit(1);
  });
}
