import { describe, expect, it } from "vitest";
import { classifyQuery } from "../src/app/classifier.js";
import { handleChat } from "../src/app/chatPipeline.js";
import { retrieve } from "../src/app/retriever.js";
import {
  ADVISORY_COMPARISON_MATRIX,
  COMPLIANCE_MATRIX,
  FACTUAL_MATRIX,
} from "../src/qa/evaluationMatrix.js";
import { isChromaAvailable } from "./helpers/chroma.js";

function evaluateFactualCase(
  result: Awaited<ReturnType<typeof retrieve>>,
  testCase: (typeof FACTUAL_MATRIX)[number],
): boolean {
  if (result.status !== "ok") return false;
  if (!result.sourceUrl?.includes(testCase.schemeIncludes)) return false;
  if (result.chunks[0]?.section !== testCase.section) return false;
  return result.chunks.length > 0;
}

describe("evaluation matrix", () => {
  it("meets factual pass rate when Chroma is available", async () => {
    const chromaReady = await isChromaAvailable();
    if (!chromaReady) {
      console.warn("Skipping factual matrix: Chroma unavailable");
      return;
    }

    let passed = 0;
    for (const testCase of FACTUAL_MATRIX) {
      const result = await retrieve(testCase.query);
      if (evaluateFactualCase(result, testCase)) {
        passed += 1;
      }
    }

    const passRate = passed / FACTUAL_MATRIX.length;
    expect(passRate).toBeGreaterThanOrEqual(0.9);
  });

  it("meets 100% pass rate for advisory and comparison refusals", async () => {
    let passed = 0;
    for (const testCase of ADVISORY_COMPARISON_MATRIX) {
      const response = await handleChat(testCase.query);
      const ok =
        response.is_refusal === testCase.expectRefusal &&
        response.citation_url.includes(testCase.citationIncludes);
      if (ok) passed += 1;
    }

    expect(passed).toBe(ADVISORY_COMPARISON_MATRIX.length);
  });

  it("meets compliance pass rate for performance and comparison queries", async () => {
    let passed = 0;
    for (const testCase of COMPLIANCE_MATRIX) {
      const response = await handleChat(testCase.query);
      const ok =
        response.is_refusal === testCase.expectRefusal &&
        response.citation_url.includes(testCase.citationIncludes) &&
        response.disclaimer.length > 0;
      if (ok) passed += 1;
    }

    expect(passed).toBe(COMPLIANCE_MATRIX.length);
  });
});
