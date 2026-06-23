import fs from "node:fs";
import { load as loadYaml } from "js-yaml";
import path from "node:path";
import { CONFIG_DIR } from "./paths.js";
import type { CorpusConfig, SchemeConfig } from "./types.js";

export function loadCorpus(): CorpusConfig {
  const filePath = path.join(CONFIG_DIR, "corpus.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = loadYaml(raw) as CorpusConfig;

  if (!parsed?.schemes?.length) {
    throw new Error("corpus.yaml must define at least one scheme");
  }

  return parsed;
}

export function getSchemeBySlug(slug: string): SchemeConfig {
  const corpus = loadCorpus();
  const scheme = corpus.schemes.find((s) => s.slug === slug);
  if (!scheme) {
    throw new Error(`Unknown scheme slug: ${slug}`);
  }
  return scheme;
}

export function getSchemeCount(): number {
  return loadCorpus().schemes.length;
}

export function corpusScopePhrase(): string {
  return `${getSchemeCount()} HDFC schemes`;
}
