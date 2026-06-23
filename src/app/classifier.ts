export type QueryLabel =
  | "factual"
  | "advisory"
  | "comparison"
  | "performance";

const COMPARISON_PATTERNS = [
  /\bwhich (?:fund|one|scheme) is better\b/i,
  /\bwhich is better\b/i,
  /\bbetter than\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bcompare\b/i,
  /\bcomparison between\b/i,
];

const ADVISORY_PATTERNS = [
  /\bshould i invest\b/i,
  /\bis it (?:a )?good (?:fund|investment|time)\b/i,
  /\bgood investment\b/i,
  /\ba good fund\b/i,
  /\bworth (?:buying|investing)\b/i,
  /\brecommend\b/i,
  /\bwhich (?:fund|scheme) should i\b/i,
  /\bbuy or sell\b/i,
  /\bhold or sell\b/i,
  /\bsuitable for me\b/i,
  /\btell me which to buy\b/i,
  /\bwhich to buy\b/i,
];

const PERFORMANCE_PATTERNS = [
  /\bexpected returns?\b/i,
  /\bwhat returns?\b/i,
  /\bhow much will i (?:make|earn|get)\b/i,
  /\bpast performance\b/i,
  /\b(?:1|3|5|10)[\s-]?year returns?\b/i,
  /\bannual(?:ised|ized)? returns?\b/i,
  /\bxirr\b/i,
  /\bcagr\b/i,
  /\boutperform\b/i,
  /\bprojected returns?\b/i,
  /\breturns will i get\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyQuery(message: string): QueryLabel {
  const text = message.trim();
  const hasComparison = matchesAny(text, COMPARISON_PATTERNS);
  const hasAdvisory = matchesAny(text, ADVISORY_PATTERNS);
  const hasPerformance = matchesAny(text, PERFORMANCE_PATTERNS);

  if (hasComparison && hasAdvisory) {
    return "advisory";
  }
  if (hasAdvisory) {
    return "advisory";
  }
  if (hasComparison) {
    return "comparison";
  }
  if (hasPerformance) {
    return "performance";
  }

  return "factual";
}
