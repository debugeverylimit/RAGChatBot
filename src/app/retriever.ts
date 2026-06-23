import type { Where } from "chromadb";
import { queryIndex } from "../ingestion/index.js";
import type {
  RetrievalResult,
  RetrievedChunk,
  SchemeMetadata,
  SectionTag,
} from "../lib/types.js";
import {
  detectSectionIntent,
  extractManagerNameHint,
} from "./sectionIntent.js";
import {
  listSupportedSchemeNames,
  loadSchemeMetadata,
  resolveScheme,
} from "./schemeResolver.js";

const SLUG_ONLY_DISTANCE_THRESHOLD = 0.55;

function buildWhereFilter(
  slug: string,
  section?: SectionTag,
  managerName?: string | null,
): Where {
  const clauses: Where[] = [{ slug }];

  if (section) {
    clauses.push({ section });
  }

  if (managerName) {
    clauses.push({ manager_name: managerName });
  }

  if (clauses.length === 1) {
    return clauses[0]!;
  }

  return { $and: clauses };
}

function resultCount(section: SectionTag | null): number {
  if (section === "fund_management") return 3;
  if (section) return 1;
  return 3;
}

function mapQueryResults(
  ids: string[],
  documents: string[],
  metadatas: Record<string, string | number | boolean>[],
  distances: number[],
): RetrievedChunk[] {
  return ids.map((id, index) => ({
    id,
    text: documents[index] ?? "",
    section: String(metadatas[index]?.section ?? ""),
    distance: distances[index] ?? 1,
    managerName: metadatas[index]?.manager_name
      ? String(metadatas[index]!.manager_name)
      : null,
  }));
}

async function getKnownManagers(slug: string): Promise<string[]> {
  const { loadAllChunks } = await import("../ingestion/index.js");
  const chunks = await loadAllChunks();
  const managers = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.id.startsWith(`${slug}#fund_management#`) && chunk.manager_name) {
      managers.add(chunk.manager_name);
    }
  }

  return [...managers];
}

function buildAmbiguousResult(schemes: SchemeMetadata[]): RetrievalResult {
  return {
    status: "ambiguous_scheme",
    schemeName: null,
    sourceUrl: null,
    lastUpdated: null,
    chunks: [],
    supportedSchemes: listSupportedSchemeNames(schemes),
    message:
      "Please specify which HDFC scheme you mean. Supported schemes: " +
      listSupportedSchemeNames(schemes).join("; "),
  };
}

export async function retrieve(query: string): Promise<RetrievalResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    const schemes = await loadSchemeMetadata();
    return buildAmbiguousResult(schemes);
  }

  const resolution = await resolveScheme(trimmedQuery);
  const schemes = await loadSchemeMetadata();

  if (resolution.status === "out_of_scope") {
    return {
      status: "out_of_scope",
      schemeName: null,
      sourceUrl: null,
      lastUpdated: null,
      chunks: [],
      supportedSchemes: listSupportedSchemeNames(schemes),
      message: resolution.reason,
    };
  }

  if (resolution.status === "ambiguous") {
    return {
      status: "ambiguous_scheme",
      schemeName: null,
      sourceUrl: null,
      lastUpdated: null,
      chunks: [],
      supportedSchemes: listSupportedSchemeNames(resolution.candidates),
      message: resolution.reason,
    };
  }

  if (resolution.status === "unresolved") {
    return buildAmbiguousResult(schemes);
  }

  const scheme = resolution.scheme;
  const section = detectSectionIntent(trimmedQuery);
  let managerName: string | null = null;

  if (section === "fund_management") {
    const knownManagers = await getKnownManagers(scheme.slug);
    managerName = extractManagerNameHint(trimmedQuery, knownManagers);
  }

  const where = buildWhereFilter(scheme.slug, section ?? undefined, managerName);
  const nResults = resultCount(section);

  const queryResult = await queryIndex({
    queryText: trimmedQuery,
    where,
    nResults,
  });

  let chunks = mapQueryResults(
    queryResult.ids,
    queryResult.documents,
    queryResult.metadatas,
    queryResult.distances,
  );

  if (section === "fund_management" && managerName) {
    chunks = chunks.filter(
      (chunk) =>
        chunk.managerName &&
        chunk.managerName.toLowerCase() === managerName.toLowerCase(),
    );
  }

  if (chunks.length === 0) {
    return {
      status: "insufficient_context",
      schemeName: scheme.scheme_name,
      sourceUrl: scheme.source_url,
      lastUpdated: scheme.last_fetched_at,
      chunks: [],
      message: "No matching content found in the indexed corpus for this query.",
    };
  }

  if (!section && chunks[0]!.distance > SLUG_ONLY_DISTANCE_THRESHOLD) {
    return {
      status: "insufficient_context",
      schemeName: scheme.scheme_name,
      sourceUrl: scheme.source_url,
      lastUpdated: scheme.last_fetched_at,
      chunks: [],
      message: `Top semantic match distance ${chunks[0]!.distance.toFixed(2)} exceeds threshold ${SLUG_ONLY_DISTANCE_THRESHOLD}.`,
    };
  }

  return {
    status: "ok",
    schemeName: scheme.scheme_name,
    sourceUrl: scheme.source_url,
    lastUpdated: scheme.last_fetched_at,
    chunks,
  };
}
