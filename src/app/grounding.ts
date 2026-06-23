import type { RetrievedChunk } from "../lib/types.js";

/** Normalize text for fuzzy comparison of facts (percentages, currency, casing). */
export function normalizeForGrounding(text: string): string {
  return text
    .toLowerCase()
    .replace(/₹/g, " rupees ")
    .replace(/\brs\.?\b/gi, " rupees ")
    .replace(/\binr\b/gi, " rupees ")
    .replace(/\bpercent\b/g, "%")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract numeric values from normalized factual text (percentages and amounts). */
export function extractNumericValues(text: string): string[] {
  const normalized = normalizeForGrounding(text);
  const values = new Set<string>();

  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
    values.add(match[1]!);
  }

  for (const match of normalized.matchAll(
    /(?:rupees?\s*|₹\s*)(\d+(?:\.\d+)?)/g,
  )) {
    values.add(match[1]!);
  }

  for (const match of normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)) {
    const num = match[1]!;
    if (num.length >= 1) {
      values.add(num);
    }
  }

  return [...values];
}

function numericValuesGrounded(answer: string, context: string): boolean {
  const answerNums = extractNumericValues(answer);
  if (answerNums.length === 0) {
    return true;
  }

  const ctx = normalizeForGrounding(context);
  return answerNums.every((num) => {
    if (ctx.includes(num)) {
      return true;
    }
    const asPercent = `${num}%`;
    return ctx.includes(asPercent);
  });
}

const STOPWORDS = new Set([
  "about",
  "after",
  "based",
  "could",
  "direct",
  "from",
  "growth",
  "hdfc",
  "have",
  "https",
  "index",
  "mutual",
  "official",
  "page",
  "plan",
  "please",
  "scheme",
  "source",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "using",
  "with",
  "your",
]);

function significantTokens(text: string): string[] {
  return normalizeForGrounding(text)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9.%]/g, ""))
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function tokenOverlapGrounded(answer: string, context: string): boolean {
  const tokens = significantTokens(answer);
  if (tokens.length === 0) {
    return true;
  }

  const ctx = normalizeForGrounding(context);
  const matched = tokens.filter(
    (token) =>
      ctx.includes(token) ||
      token.length >= 6 &&
        [...ctx.matchAll(/\b[a-z0-9.%]{4,}\b/g)].some(
          (m) => m[0]!.includes(token) || token.includes(m[0]!),
        ),
  );

  return matched.length / tokens.length >= 0.25;
}

export function isGroundedInChunks(
  answer: string,
  chunks: RetrievedChunk[],
): boolean {
  const body = answer
    .replace(/\n\nLast updated from sources:\s*\d{4}-\d{2}-\d{2}\s*$/i, "")
    .trim();
  const context = chunks.map((chunk) => chunk.text).join("\n");

  if (!numericValuesGrounded(body, context)) {
    return false;
  }

  return tokenOverlapGrounded(body, context);
}
