import fs from "node:fs/promises";
import { metadataIndexPath } from "../lib/paths.js";
import type { SchemeMetadata, SchemeResolution } from "../lib/types.js";

const OUT_OF_SCOPE_AMC_KEYWORDS = [
  "sbi",
  "sbi mutual",
  "sbi fund",
  "icici",
  "icici prudential",
  "icici fund",
  "axis",
  "axis mutual",
  "axis fund",
  "kotak",
  "kotak mutual",
  "nippon",
  "nippon india",
  "mirae asset",
  "dsp mutual",
  "uti mutual",
  "tata mutual",
  "franklin templeton",
  "parag parikh",
  "bandhan mutual",
  "motilal oswal",
  "quant mutual",
  "pgim india",
  "invesco mutual",
  "hsbc mutual",
  "aditya birla",
  "canara robeco",
];

let cachedMetadata: SchemeMetadata[] | null = null;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function loadSchemeMetadata(): Promise<SchemeMetadata[]> {
  if (cachedMetadata) return cachedMetadata;
  const raw = await fs.readFile(metadataIndexPath(), "utf8");
  cachedMetadata = JSON.parse(raw) as SchemeMetadata[];
  return cachedMetadata;
}

function matchesSlugOrUrl(query: string, scheme: SchemeMetadata): boolean {
  const normalized = normalize(query);
  return (
    normalized.includes(scheme.slug) ||
    normalized.includes(normalize(scheme.source_url))
  );
}

function matchesSchemeName(query: string, schemeName: string): boolean {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(schemeName);

  if (normalizedQuery.includes(normalizedName)) {
    return true;
  }

  const withoutPlanSuffix = normalizedName
    .replace(/\s+direct\s+(plan\s+)?growth$/i, "")
    .replace(/\s+direct\s+growth$/i, "")
    .trim();

  return (
    normalizedQuery.includes(withoutPlanSuffix) ||
    withoutPlanSuffix.includes(normalizedQuery)
  );
}

type AliasMatch = {
  scheme: SchemeMetadata;
  alias: string;
  length: number;
};

function findAliasMatches(
  query: string,
  schemes: SchemeMetadata[],
): AliasMatch[] {
  const normalizedQuery = normalize(query);
  const matches: AliasMatch[] = [];

  for (const scheme of schemes) {
    for (const alias of scheme.aliases) {
      const normalizedAlias = normalize(alias);
      if (normalizedQuery.includes(normalizedAlias)) {
        matches.push({ scheme, alias, length: normalizedAlias.length });
      }
    }
  }

  return matches;
}

function isOutOfScopeQuery(query: string): string | null {
  const normalized = normalize(query);
  for (const keyword of OUT_OF_SCOPE_AMC_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return `This assistant only covers five HDFC schemes on Groww; it does not include ${keyword}.`;
    }
  }
  return null;
}

export async function resolveScheme(query: string): Promise<SchemeResolution> {
  const schemes = await loadSchemeMetadata();
  const slugMatches = schemes.filter((scheme) => matchesSlugOrUrl(query, scheme));
  if (slugMatches.length === 1) {
    return { status: "resolved", scheme: slugMatches[0]! };
  }
  if (slugMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: slugMatches,
      reason: "Multiple corpus scheme URLs or slugs matched the query.",
    };
  }

  const nameMatches = schemes.filter((scheme) =>
    matchesSchemeName(query, scheme.scheme_name),
  );
  if (nameMatches.length === 1) {
    return { status: "resolved", scheme: nameMatches[0]! };
  }
  if (nameMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: nameMatches,
      reason: "Multiple scheme names matched the query.",
    };
  }

  const aliasMatches = findAliasMatches(query, schemes);
  if (aliasMatches.length > 0) {
    const longest = Math.max(...aliasMatches.map((match) => match.length));
    const longestMatches = aliasMatches.filter((match) => match.length === longest);
    const uniqueSchemes = new Map(
      longestMatches.map((match) => [match.scheme.slug, match.scheme]),
    );

    if (uniqueSchemes.size === 1) {
      return {
        status: "resolved",
        scheme: longestMatches[0]!.scheme,
      };
    }

    return {
      status: "ambiguous",
      candidates: [...uniqueSchemes.values()],
      reason: `Multiple schemes matched alias length ${longest}.`,
    };
  }

  const outOfScopeReason = isOutOfScopeQuery(query);
  if (outOfScopeReason) {
    return { status: "out_of_scope", reason: outOfScopeReason };
  }

  return { status: "unresolved" };
}

export function listSupportedSchemeNames(schemes: SchemeMetadata[]): string[] {
  return schemes.map((scheme) => scheme.scheme_name);
}
