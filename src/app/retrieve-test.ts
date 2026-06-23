import { retrieve } from "./retriever.js";

const MANUAL_QUERIES = [
  {
    query: "Expense ratio of HDFC Mid Cap Fund",
    schemeIncludes: "mid-cap",
    section: "expense_ratio",
    status: "ok" as const,
  },
  {
    query: "Exit load on Defence Fund",
    schemeIncludes: "defence",
    section: "exit_load",
    status: "ok" as const,
  },
  {
    query: "Who manages Gold ETF FoF?",
    schemeIncludes: "gold-etf",
    section: "fund_management",
    status: "ok" as const,
  },
  {
    query: "Minimum SIP for Small Cap",
    schemeIncludes: "small-cap",
    section: "minimum_investment",
    status: "ok" as const,
  },
  {
    query: "Benchmark of Large and Mid Cap Fund",
    schemeIncludes: "large-and-mid-cap",
    section: "benchmark",
    status: "ok" as const,
  },
  {
    query: "expense ratio",
    status: "ambiguous_scheme" as const,
  },
  {
    query: "SBI Blue Chip fund expense ratio",
    status: "out_of_scope" as const,
  },
];

async function main(): Promise<void> {
  console.log("=== Retrieval probe (Phase 3) ===\n");

  let passed = 0;
  let failed = 0;

  for (const test of MANUAL_QUERIES) {
    const result = await retrieve(test.query);
    let ok = result.status === test.status;

    if (ok && test.status === "ok") {
      const slug = result.sourceUrl ?? "";
      ok =
        slug.includes(test.schemeIncludes!) &&
        result.chunks[0]?.section === test.section;
    }

    if (ok && test.status !== "ok") {
      ok = result.chunks.length === 0;
    }

    console.log(`${ok ? "PASS" : "FAIL"} | ${test.query}`);
    console.log(`       status=${result.status} chunks=${result.chunks.length}`);
    if (result.chunks[0]) {
      console.log(
        `       top=${result.chunks[0].section} d=${result.chunks[0].distance.toFixed(3)}`,
      );
    }
    if (result.sourceUrl) {
      console.log(`       citation=${result.sourceUrl}`);
    }
    console.log("");

    if (ok) passed += 1;
    else failed += 1;
  }

  console.log(`Results: ${passed}/${MANUAL_QUERIES.length} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
