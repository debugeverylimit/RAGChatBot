import { describe, expect, it } from "vitest";
import { retrieve } from "../src/app/retriever.js";
import { validateResponse } from "../src/app/validator.js";
import { loadCorpus } from "../src/lib/corpus.js";
import { isChromaAvailable } from "./helpers/chroma.js";

const VERIFICATION_FAILURE =
  "I could not verify this answer against the retrieved source text";

type FactualCase = {
  query: string;
  schemeIncludes: string;
  section: string;
  buildAnswer: (chunkText: string) => string;
};

const FACTUAL_CASES: FactualCase[] = [
  {
    query: "What is the expense ratio of HDFC Silver ETF FoF Direct Growth?",
    schemeIncludes: "silver-etf-fof",
    section: "expense_ratio",
    buildAnswer: (text) => {
      const match = text.match(/Expense ratio:\s*([\d.]+%)/i);
      return `The expense ratio of HDFC Silver ETF FoF Direct Growth is ${match?.[1] ?? "listed in the source"}.`;
    },
  },
  {
    query: "What is the expense ratio of HDFC Mid Cap Fund Direct Growth?",
    schemeIncludes: "mid-cap",
    section: "expense_ratio",
    buildAnswer: (text) => {
      const match = text.match(/Expense ratio:\s*([\d.]+%)/i);
      return `The expense ratio of HDFC Mid Cap Fund Direct Growth is ${match?.[1] ?? "listed in the source"}.`;
    },
  },
  {
    query: "What is the minimum SIP amount for HDFC Defence Fund Direct Growth?",
    schemeIncludes: "defence",
    section: "minimum_investment",
    buildAnswer: (text) => {
      const match = text.match(/Minimum SIP:\s*₹([\d,]+)/i);
      return `The minimum SIP for HDFC Defence Fund Direct Growth is ₹${match?.[1] ?? "listed in the source"}.`;
    },
  },
  {
    query: "Who manages HDFC Pharma and Healthcare Fund Direct Growth?",
    schemeIncludes: "pharma-and-healthcare",
    section: "fund_management",
    buildAnswer: (text) => {
      const match = text.match(/^(.+?) — Fund Manager/m);
      return match
        ? `${match[1]} manages HDFC Pharma and Healthcare Fund Direct Growth.`
        : "Fund manager details are listed in the source.";
    },
  },
  {
    query: "What is the benchmark index of HDFC Large and Mid Cap Fund Direct Growth?",
    schemeIncludes: "large-and-mid-cap",
    section: "benchmark",
    buildAnswer: (text) => {
      const match = text.match(/Benchmark:\s*(.+)/i);
      return `The benchmark index is ${match?.[1]?.trim() ?? "listed in the source"}.`;
    },
  },
];

describe("corpus configuration", () => {
  it("includes all 15 Groww scheme URLs", () => {
    const corpus = loadCorpus();
    expect(corpus.schemes).toHaveLength(15);
    for (const scheme of corpus.schemes) {
      expect(scheme.source_url).toMatch(
        /^https:\/\/groww\.in\/mutual-funds\//,
      );
    }
  });
});

describe("factual query pipeline", () => {
  it.each(FACTUAL_CASES)(
    "retrieves and validates: $query",
    async (testCase) => {
      const chromaReady = await isChromaAvailable();
      if (!chromaReady) {
        console.warn("Skipping factual pipeline tests: Chroma unavailable");
        return;
      }

      const retrieval = await retrieve(testCase.query);
      expect(retrieval.status).toBe("ok");
      expect(retrieval.sourceUrl).toContain(testCase.schemeIncludes);
      expect(retrieval.chunks.length).toBeGreaterThan(0);
      expect(retrieval.chunks[0]?.section).toBe(testCase.section);

      const chunk = retrieval.chunks.find((c) => c.section === testCase.section)
        ?? retrieval.chunks[0]!;

      const draftAnswer = testCase.buildAnswer(chunk.text);
      const validated = validateResponse({
        answer: draftAnswer,
        citation_url: retrieval.sourceUrl!,
        is_refusal: false,
        chunks: retrieval.chunks,
      });

      expect(validated.issues).not.toContain("performance_claim");
      expect(validated.issues).not.toContain("grounding_failed");
      expect(validated.answer).not.toContain(VERIFICATION_FAILURE);
      expect(validated.answer.toLowerCase()).not.toContain("could not verify");
    },
  );
});

describe("expense ratio validator regression", () => {
  it("does not treat expense ratio percentages as performance claims", () => {
    const answer =
      "The expense ratio of HDFC Silver ETF FoF Direct Growth is 0.22%.";
    const chunks = [
      {
        id: "silver#expense_ratio#0",
        text: "Expense ratio: 0.22% (Direct Growth plan).",
        section: "expense_ratio",
        distance: 0.1,
        managerName: null,
      },
    ];

    const result = validateResponse({
      answer,
      citation_url:
        "https://groww.in/mutual-funds/hdfc-silver-etf-fof-direct-growth",
      is_refusal: false,
      chunks,
    });

    expect(result.issues).not.toContain("performance_claim");
    expect(result.issues).not.toContain("grounding_failed");
    expect(result.answer).toBe(answer);
  });
});
