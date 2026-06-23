import type { SectionTag } from "../lib/types.js";

type SectionRule = {
  section: SectionTag;
  keywords: string[];
};

const SECTION_RULES: SectionRule[] = [
  {
    section: "expense_ratio",
    keywords: ["expense ratio", "expense", "ter"],
  },
  {
    section: "exit_load",
    keywords: ["exit load", "redemption charge", "exit fee"],
  },
  {
    section: "minimum_investment",
    keywords: [
      "minimum sip",
      "min sip",
      "sip amount",
      "minimum investment",
      "lumpsum",
      "lump sum",
    ],
  },
  {
    section: "benchmark",
    keywords: ["benchmark", "index benchmark"],
  },
  {
    section: "fund_management",
    keywords: [
      "fund manager",
      "who manages",
      "manages",
      "manager",
      "tenure",
      "education",
      "experience",
    ],
  },
  {
    section: "tax",
    keywords: ["tax", "stamp duty", "capital gains", "ltcg", "stcg"],
  },
  {
    section: "investment_objective",
    keywords: ["investment objective", "objective", "goal"],
  },
  {
    section: "fund_house",
    keywords: ["fund house", "amc", "registrar"],
  },
  {
    section: "overview",
    keywords: ["nav", "aum", "fund size", "risk", "risk classification", "rating", "category"],
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectSectionIntent(query: string): SectionTag | null {
  const normalizedQuery = normalize(query);

  for (const rule of SECTION_RULES) {
    for (const keyword of rule.keywords) {
      if (normalizedQuery.includes(keyword)) {
        return rule.section;
      }
    }
  }

  return null;
}

export function extractManagerNameHint(
  query: string,
  knownManagers: string[],
): string | null {
  const normalizedQuery = normalize(query);
  let bestMatch: string | null = null;
  let bestLength = 0;

  for (const manager of knownManagers) {
    const normalizedManager = normalize(manager);
    if (
      normalizedQuery.includes(normalizedManager) &&
      normalizedManager.length > bestLength
    ) {
      bestMatch = manager;
      bestLength = normalizedManager.length;
    }
  }

  return bestMatch;
}

export { SECTION_RULES };
