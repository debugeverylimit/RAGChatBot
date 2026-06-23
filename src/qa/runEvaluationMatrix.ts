import { fileURLToPath } from "node:url";
import path from "node:path";
import { handleChat } from "../app/chatPipeline.js";
import { retrieve } from "../app/retriever.js";
import { isChromaAvailable } from "../lib/chromaHealth.js";
import {
  ADVISORY_COMPARISON_MATRIX,
  COMPLIANCE_MATRIX,
  FACTUAL_MATRIX,
  type FactualMatrixCase,
} from "./evaluationMatrix.js";

function evaluateFactualCase(
  result: Awaited<ReturnType<typeof retrieve>>,
  testCase: FactualMatrixCase,
): boolean {
  return (
    result.status === "ok" &&
    Boolean(result.sourceUrl?.includes(testCase.schemeIncludes)) &&
    result.chunks[0]?.section === testCase.section &&
    result.chunks.length > 0
  );
}

async function main(): Promise<void> {
  console.log("=== QA Evaluation Matrix (Phase 8) ===\n");

  const chromaReady = await isChromaAvailable();
  let factualPassed = 0;

  if (chromaReady) {
    console.log(`Factual queries (${FACTUAL_MATRIX.length})`);
    for (const testCase of FACTUAL_MATRIX) {
      const result = await retrieve(testCase.query);
      const ok = evaluateFactualCase(result, testCase);
      console.log(`${ok ? "PASS" : "FAIL"} | [${testCase.category}] ${testCase.query}`);
      if (ok) factualPassed += 1;
    }
    const factualRate = Math.round((factualPassed / FACTUAL_MATRIX.length) * 100);
    console.log(`\nFactual pass rate: ${factualPassed}/${FACTUAL_MATRIX.length} (${factualRate}%)\n`);
  } else {
    console.warn("Chroma unavailable — skipped factual matrix.\n");
  }

  let compliancePassed = 0;
  console.log(`Compliance queries (${COMPLIANCE_MATRIX.length})`);
  for (const testCase of COMPLIANCE_MATRIX) {
    const response = await handleChat(testCase.query);
    const ok =
      response.is_refusal === testCase.expectRefusal &&
      response.citation_url.includes(testCase.citationIncludes);
    console.log(`${ok ? "PASS" : "FAIL"} | [${testCase.category}] ${testCase.query}`);
    if (ok) compliancePassed += 1;
  }
  console.log(
    `\nCompliance pass rate: ${compliancePassed}/${COMPLIANCE_MATRIX.length} (${Math.round((compliancePassed / COMPLIANCE_MATRIX.length) * 100)}%)\n`,
  );

  let advisoryOk = 0;
  for (const testCase of ADVISORY_COMPARISON_MATRIX) {
    const response = await handleChat(testCase.query);
    if (
      response.is_refusal &&
      response.citation_url.includes(testCase.citationIncludes)
    ) {
      advisoryOk += 1;
    }
  }
  console.log(
    `Advisory/comparison pass rate: ${advisoryOk}/${ADVISORY_COMPARISON_MATRIX.length}`,
  );

  if (chromaReady && factualPassed / FACTUAL_MATRIX.length < 0.9) {
    console.error("\nFactual pass rate below 90%.");
    process.exit(1);
  }
  if (compliancePassed < COMPLIANCE_MATRIX.length || advisoryOk < ADVISORY_COMPARISON_MATRIX.length) {
    console.error("\nCompliance pass rate below 100%.");
    process.exit(1);
  }

  console.log("\nEvaluation matrix passed.");
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
