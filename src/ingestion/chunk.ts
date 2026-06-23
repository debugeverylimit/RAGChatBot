import fs from "node:fs/promises";
import { loadCorpus } from "../lib/corpus.js";
import { chunksPath, processedDir } from "../lib/paths.js";
import type { ChunkRecord, FundManagerDetail, ParsedScheme, SectionTag } from "../lib/types.js";
import { SECTION_TAGS } from "../lib/types.js";
import { extractGrowwData, buildManagerBio } from "./parse.js";
import { readRawHtml } from "./fetch.js";

const REQUIRED_SECTIONS: SectionTag[] = [
  "expense_ratio",
  "exit_load",
  "minimum_investment",
  "benchmark",
  "fund_management",
];

const MAX_CHUNK_CHARS = 1600;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkHeader(
  schemeName: string,
  section: SectionTag,
  sourceUrl: string,
): string {
  return `Scheme: ${schemeName}\nSection: ${section}\nSource: ${sourceUrl}\n\n`;
}

function splitLongText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\n+/);
  const parts: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) parts.push(current);
    if (paragraph.length <= maxChars) {
      current = paragraph;
    } else {
      parts.push(paragraph.slice(0, maxChars));
      current = paragraph.slice(maxChars);
    }
  }

  if (current) parts.push(current);
  return parts;
}

function buildChunk(
  slug: string,
  parsed: ParsedScheme,
  section: SectionTag,
  body: string,
  index: number,
  managerName?: string,
): ChunkRecord {
  const header = chunkHeader(parsed.scheme_name, section, parsed.source_url);
  const text = `${header}${body.trim()}`;

  const chunk: ChunkRecord = {
    id: `${slug}#${section}#${index}`,
    text,
    scheme_name: parsed.scheme_name,
    source_url: parsed.source_url,
    section,
    last_updated: parsed.last_updated,
    token_estimate: estimateTokens(text),
  };

  if (managerName) {
    chunk.manager_name = managerName;
  }

  return chunk;
}

async function chunkFundManagementAsync(
  parsed: ParsedScheme,
): Promise<ChunkRecord[]> {
  const html = await readRawHtml(parsed.slug);
  const data = extractGrowwData(html);
  const managers = data.fund_manager_details ?? [];

  if (managers.length === 0) {
    return [
      buildChunk(
        parsed.slug,
        parsed,
        "fund_management",
        parsed.sections.fund_management,
        0,
      ),
    ];
  }

  return managers.map((manager: FundManagerDetail, index: number) =>
    buildChunk(
      parsed.slug,
      parsed,
      "fund_management",
      buildManagerBio(manager),
      index,
      manager.person_name,
    ),
  );
}

function chunkStandardSection(
  parsed: ParsedScheme,
  section: SectionTag,
): ChunkRecord[] {
  const body = parsed.sections[section];
  const parts = splitLongText(body, MAX_CHUNK_CHARS);

  return parts.map((part, index) =>
    buildChunk(parsed.slug, parsed, section, part, index),
  );
}

export async function chunkScheme(parsed: ParsedScheme): Promise<ChunkRecord[]> {
  const chunks: ChunkRecord[] = [];

  for (const section of SECTION_TAGS) {
    if (section === "fund_management") {
      chunks.push(...(await chunkFundManagementAsync(parsed)));
      continue;
    }
    chunks.push(...chunkStandardSection(parsed, section));
  }

  await fs.mkdir(processedDir(parsed.slug), { recursive: true });
  await fs.writeFile(chunksPath(parsed.slug), JSON.stringify(chunks, null, 2), "utf8");
  return chunks;
}

export async function chunkAllSchemes(
  parsedSchemes: ParsedScheme[],
): Promise<ChunkRecord[]> {
  const all: ChunkRecord[] = [];
  for (const parsed of parsedSchemes) {
    console.log(`Chunking ${parsed.slug}...`);
    all.push(...(await chunkScheme(parsed)));
  }
  return all;
}

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  totalChunks: number;
  byScheme: Record<string, number>;
};

export async function validateAllChunks(): Promise<ValidationResult> {
  const corpus = loadCorpus();
  const errors: string[] = [];
  const byScheme: Record<string, number> = {};
  let totalChunks = 0;

  for (const scheme of corpus.schemes) {
    let chunks: ChunkRecord[];
    try {
      const raw = await fs.readFile(chunksPath(scheme.slug), "utf8");
      chunks = JSON.parse(raw) as ChunkRecord[];
    } catch {
      errors.push(`${scheme.slug}: missing chunks.json`);
      continue;
    }

    byScheme[scheme.slug] = chunks.length;
    totalChunks += chunks.length;

    for (const required of REQUIRED_SECTIONS) {
      const found = chunks.some((c) => c.section === required);
      if (!found) {
        errors.push(`${scheme.slug}: missing required section "${required}"`);
      }
    }

    for (const chunk of chunks) {
      if (!chunk.scheme_name) {
        errors.push(`${chunk.id}: missing scheme_name`);
      }
      if (!chunk.source_url) {
        errors.push(`${chunk.id}: missing source_url`);
      }
      if (!chunk.section) {
        errors.push(`${chunk.id}: missing section`);
      }
      if (!chunk.last_updated) {
        errors.push(`${chunk.id}: missing last_updated`);
      }
      if (!chunk.text.includes("Scheme:") || !chunk.text.includes("Source:")) {
        errors.push(`${chunk.id}: missing chunk text header`);
      }
    }

    const managerChunks = chunks.filter((c) => c.section === "fund_management");
    if (managerChunks.length === 0) {
      errors.push(`${scheme.slug}: fund_management has no chunks`);
    }
  }

  if (totalChunks < 40) {
    errors.push(`Expected at least 40 chunks total, got ${totalChunks}`);
  }

  return { ok: errors.length === 0, errors, totalChunks, byScheme };
}
