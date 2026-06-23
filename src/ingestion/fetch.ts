import fs from "node:fs/promises";
import { loadCorpus } from "../lib/corpus.js";
import { RAW_DIR, rawHtmlPath, rawMetaPath } from "../lib/paths.js";
import type { FetchMeta, SchemeConfig } from "../lib/types.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchSchemePage(scheme: SchemeConfig): Promise<FetchMeta> {
  const response = await fetch(scheme.source_url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${scheme.slug}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const fetchedAt = new Date().toISOString();

  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(rawHtmlPath(scheme.slug), html, "utf8");

  const meta: FetchMeta = {
    slug: scheme.slug,
    source_url: scheme.source_url,
    fetched_at: fetchedAt,
    status: response.status,
    content_type: response.headers.get("content-type"),
  };

  await fs.writeFile(rawMetaPath(scheme.slug), JSON.stringify(meta, null, 2), "utf8");
  return meta;
}

export async function fetchAllSchemes(): Promise<FetchMeta[]> {
  const corpus = loadCorpus();
  const results: FetchMeta[] = [];
  const failures: { slug: string; error: string }[] = [];

  console.log(`Starting fetch for ${corpus.schemes.length} scheme URLs...`);

  for (const scheme of corpus.schemes) {
    try {
      console.log(`Fetching ${scheme.slug}...`);
      results.push(await fetchSchemePage(scheme));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch ${scheme.slug}: ${message}`);
      failures.push({ slug: scheme.slug, error: message });
    }
  }

  console.log(
    `Fetch complete: ${results.length}/${corpus.schemes.length} pages ingested successfully.`,
  );
  if (failures.length > 0) {
    console.error(`Fetch failures (${failures.length}):`, failures);
  }

  return results;
}

export async function readFetchMeta(slug: string): Promise<FetchMeta> {
  const raw = await fs.readFile(rawMetaPath(slug), "utf8");
  return JSON.parse(raw) as FetchMeta;
}

export async function readRawHtml(slug: string): Promise<string> {
  return fs.readFile(rawHtmlPath(slug), "utf8");
}

export function listRawSlugs(): string[] {
  return loadCorpus().schemes.map((s) => s.slug);
}

export async function ensureRawExists(slug: string): Promise<void> {
  try {
    await fs.access(rawHtmlPath(slug));
  } catch {
    throw new Error(`Missing raw HTML for ${slug}. Run fetch first.`);
  }
}

export async function getLatestFetchDate(slug: string): Promise<string> {
  const meta = await readFetchMeta(slug);
  return meta.fetched_at.slice(0, 10);
}
