import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "../..");

export const DATA_DIR = path.join(ROOT_DIR, "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const PROCESSED_DIR = path.join(DATA_DIR, "processed");
export const INDEX_DIR = path.join(DATA_DIR, "index");
export const CHROMA_DIR = path.join(INDEX_DIR, "chroma");
export const CONFIG_DIR = path.join(ROOT_DIR, "config");

export function rawHtmlPath(slug: string): string {
  return path.join(RAW_DIR, `${slug}.html`);
}

export function rawMetaPath(slug: string): string {
  return path.join(RAW_DIR, `${slug}.meta.json`);
}

export function processedDir(slug: string): string {
  return path.join(PROCESSED_DIR, slug);
}

export function sectionsPath(slug: string): string {
  return path.join(processedDir(slug), "sections.json");
}

export function chunksPath(slug: string): string {
  return path.join(processedDir(slug), "chunks.json");
}

export function cleanedTextPath(slug: string): string {
  return path.join(processedDir(slug), "cleaned.txt");
}

export function metadataIndexPath(): string {
  return path.join(PROCESSED_DIR, "metadata.json");
}

export function activeIndexPath(): string {
  return path.join(INDEX_DIR, "active.json");
}
