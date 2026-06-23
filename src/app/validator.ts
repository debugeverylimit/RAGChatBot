import { loadCorpus } from "../lib/corpus.js";
import type { RetrievedChunk } from "../lib/types.js";
import {
  AMFI_EDUCATION_URL,
  SEBI_EDUCATION_URL,
} from "./schemas.js";

const ADVISORY_LANGUAGE = [
  /\byou should invest\b/i,
  /\bi recommend\b/i,
  /\bbuy this fund\b/i,
  /\bsell this fund\b/i,
  /\bbetter fund\b/i,
  /\bgood investment\b/i,
  /\bwill outperform\b/i,
];

const PERFORMANCE_LANGUAGE = [
  /\b\d+(?:\.\d+)?%/,
  /\b(?:cagr|xirr)\b/i,
  /\b\d+\s*(?:year|yr|month|mo)\s+return/i,
];

export function getCitationAllowlist(): Set<string> {
  const corpus = loadCorpus();
  const urls = new Set<string>([
    AMFI_EDUCATION_URL,
    SEBI_EDUCATION_URL,
  ]);

  for (const scheme of corpus.schemes) {
    urls.add(scheme.source_url);
  }

  return urls;
}

export function countSentences(text: string): number {
  const stripped = stripFooter(text);
  const matches = stripped.match(/[^.!?]+[.!?]+/g);
  return matches?.length ?? (stripped.trim() ? 1 : 0);
}

export function stripFooter(text: string): string {
  return text
    .replace(/\n\nLast updated from sources:\s*\d{4}-\d{2}-\d{2}\s*$/i, "")
    .trim();
}

export function trimToThreeSentences(text: string): string {
  const body = stripFooter(text);
  const sentences = body.match(/[^.!?]+[.!?]+/g) ?? [body];
  return sentences.slice(0, 3).join(" ").trim();
}

export function containsAdvisoryLanguage(text: string): boolean {
  return ADVISORY_LANGUAGE.some((pattern) => pattern.test(text));
}

export function containsPerformanceClaims(text: string): boolean {
  return PERFORMANCE_LANGUAGE.some((pattern) => pattern.test(text));
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9.%₹]/g, "");
}

export function isGroundedInChunks(
  answer: string,
  chunks: RetrievedChunk[],
): boolean {
  const body = stripFooter(answer);
  const context = chunks.map((chunk) => chunk.text).join(" ").toLowerCase();

  const numbers = body.match(/\d+(?:\.\d+)?%?/g) ?? [];
  for (const number of numbers) {
    if (!context.includes(number)) {
      return false;
    }
  }

  const tokens = body
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length >= 5);

  if (tokens.length === 0) {
    return true;
  }

  const matched = tokens.filter((token) => context.includes(token));
  return matched.length / tokens.length >= 0.35;
}

export type ValidationInput = {
  answer: string;
  citation_url: string;
  is_refusal: boolean;
  chunks?: RetrievedChunk[];
};

export function validateResponse(input: ValidationInput): {
  answer: string;
  citation_url: string;
  issues: string[];
} {
  const issues: string[] = [];
  let answer = stripFooter(input.answer);
  let citation_url = input.citation_url;

  const allowlist = getCitationAllowlist();
  if (!allowlist.has(citation_url)) {
    issues.push("citation_not_allowed");
    if (input.chunks?.[0]) {
      citation_url = String(input.chunks[0].text.match(/Source: (https:\/\/\S+)/)?.[1] ?? citation_url);
    }
    if (!allowlist.has(citation_url)) {
      citation_url = AMFI_EDUCATION_URL;
    }
  }

  if (countSentences(answer) > 3) {
    issues.push("too_many_sentences");
    answer = trimToThreeSentences(answer);
  }

  if (!input.is_refusal) {
    if (containsAdvisoryLanguage(answer)) {
      issues.push("advisory_language");
      answer =
        "I can only share factual scheme information from my sources. Please ask about expense ratio, exit load, benchmark, minimum SIP, or fund manager details for a named scheme.";
    }

    if (containsPerformanceClaims(answer)) {
      issues.push("performance_claim");
      answer =
        "I cannot provide return projections or performance calculations. Please refer to the linked official scheme page for historical data.";
    }

    if (input.chunks && input.chunks.length > 0 && !isGroundedInChunks(answer, input.chunks)) {
      issues.push("grounding_failed");
      answer =
        "I could not verify this answer against the retrieved source text. Please check the linked official scheme page for the latest facts.";
    }
  }

  return { answer, citation_url, issues };
}
