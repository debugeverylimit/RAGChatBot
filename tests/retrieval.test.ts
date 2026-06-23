import { describe, expect, it } from "vitest";
import { detectSectionIntent } from "../src/app/sectionIntent.js";
import { resolveScheme } from "../src/app/schemeResolver.js";
import { retrieve } from "../src/app/retriever.js";
import { isChromaAvailable } from "./helpers/chroma.js";

describe("scheme resolution", () => {
  it("resolves mid cap scheme by alias", async () => {
    const result = await resolveScheme("expense ratio for mid cap fund");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.scheme.slug).toContain("mid-cap");
    }
  });

  it("resolves defence scheme", async () => {
    const result = await resolveScheme("exit load on defence fund");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.scheme.slug).toContain("defence");
    }
  });

  it("marks ambiguous queries without a scheme", async () => {
    const result = await resolveScheme("expense ratio");
    expect(["unresolved", "ambiguous"]).toContain(result.status);
  });

  it("marks out-of-scope AMC queries", async () => {
    const result = await resolveScheme("SBI Blue Chip fund expense ratio");
    expect(result.status).toBe("out_of_scope");
  });
});

describe("section intent", () => {
  it("detects expense ratio intent", () => {
    expect(detectSectionIntent("What is the expense ratio?")).toBe("expense_ratio");
  });

  it("detects exit load intent", () => {
    expect(detectSectionIntent("Exit load on defence fund")).toBe("exit_load");
  });

  it("detects fund management intent", () => {
    expect(detectSectionIntent("Who manages the gold ETF fund?")).toBe(
      "fund_management",
    );
  });

  it("detects minimum investment intent", () => {
    expect(detectSectionIntent("Minimum SIP amount")).toBe("minimum_investment");
  });

  it("detects benchmark intent", () => {
    expect(detectSectionIntent("What is the benchmark index?")).toBe("benchmark");
  });
});

describe("retrieve integration", () => {
  it("returns grounded chunks for named factual queries when Chroma is available", async () => {
    const chromaReady = await isChromaAvailable();
    if (!chromaReady) {
      console.warn("Skipping retrieval integration tests: Chroma unavailable");
      return;
    }

    const cases = [
      {
        query: "Expense ratio of HDFC Mid Cap Fund",
        schemeIncludes: "mid-cap",
        section: "expense_ratio",
      },
      {
        query: "Exit load on Defence Fund",
        schemeIncludes: "defence",
        section: "exit_load",
      },
      {
        query: "Benchmark of Large Cap Fund",
        schemeIncludes: "large-cap",
        section: "benchmark",
      },
    ];

    for (const testCase of cases) {
      const result = await retrieve(testCase.query);
      expect(result.status).toBe("ok");
      expect(result.sourceUrl).toContain(testCase.schemeIncludes);
      expect(result.chunks[0]?.section).toBe(testCase.section);
      expect(result.chunks.length).toBeGreaterThan(0);
    }
  });

  it("returns ambiguous_scheme without chunks when scheme is missing", async () => {
    const chromaReady = await isChromaAvailable();
    if (!chromaReady) return;

    const result = await retrieve("expense ratio");
    expect(result.status).toBe("ambiguous_scheme");
    expect(result.chunks).toHaveLength(0);
  });
});
