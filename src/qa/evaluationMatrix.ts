export type FactualMatrixCase = {
  category: string;
  query: string;
  schemeIncludes: string;
  section: string;
};

export type ComplianceMatrixCase = {
  category: string;
  query: string;
  expectRefusal: boolean;
  citationIncludes: string;
};

export const FACTUAL_MATRIX: FactualMatrixCase[] = [
  {
    category: "expense_ratio",
    query: "What is the expense ratio of HDFC Mid Cap Fund Direct Growth?",
    schemeIncludes: "mid-cap",
    section: "expense_ratio",
  },
  {
    category: "expense_ratio",
    query: "Expense ratio for HDFC Large and Mid Cap Fund Direct Growth",
    schemeIncludes: "large-and-mid-cap",
    section: "expense_ratio",
  },
  {
    category: "expense_ratio",
    query: "TER of HDFC Small Cap Fund Direct Growth",
    schemeIncludes: "small-cap",
    section: "expense_ratio",
  },
  {
    category: "expense_ratio",
    query: "Expense ratio of HDFC Defence Fund Direct Growth",
    schemeIncludes: "defence",
    section: "expense_ratio",
  },
  {
    category: "expense_ratio",
    query: "Expense ratio for HDFC Gold ETF Fund of Fund Direct Plan Growth",
    schemeIncludes: "gold-etf",
    section: "expense_ratio",
  },
  {
    category: "exit_load",
    query: "What is the exit load on HDFC Mid Cap Fund Direct Growth?",
    schemeIncludes: "mid-cap",
    section: "exit_load",
  },
  {
    category: "exit_load",
    query: "Exit load for HDFC Large and Mid Cap Fund Direct Growth",
    schemeIncludes: "large-and-mid-cap",
    section: "exit_load",
  },
  {
    category: "exit_load",
    query: "Exit load on HDFC Small Cap Fund Direct Growth",
    schemeIncludes: "small-cap",
    section: "exit_load",
  },
  {
    category: "exit_load",
    query: "What is the exit load on HDFC Defence Fund Direct Growth?",
    schemeIncludes: "defence",
    section: "exit_load",
  },
  {
    category: "exit_load",
    query: "Exit load for HDFC Gold ETF Fund of Fund Direct Plan Growth",
    schemeIncludes: "gold-etf",
    section: "exit_load",
  },
  {
    category: "minimum_investment",
    query: "Minimum SIP for HDFC Mid Cap Fund Direct Growth",
    schemeIncludes: "mid-cap",
    section: "minimum_investment",
  },
  {
    category: "minimum_investment",
    query: "What is the minimum SIP amount for HDFC Large and Mid Cap Fund?",
    schemeIncludes: "large-and-mid-cap",
    section: "minimum_investment",
  },
  {
    category: "minimum_investment",
    query: "Minimum investment for HDFC Small Cap Fund Direct Growth",
    schemeIncludes: "small-cap",
    section: "minimum_investment",
  },
  {
    category: "minimum_investment",
    query: "Minimum SIP for HDFC Defence Fund Direct Growth",
    schemeIncludes: "defence",
    section: "minimum_investment",
  },
  {
    category: "minimum_investment",
    query: "Minimum SIP amount for HDFC Gold ETF FoF",
    schemeIncludes: "gold-etf",
    section: "minimum_investment",
  },
  {
    category: "benchmark",
    query: "Benchmark of HDFC Mid Cap Fund Direct Growth",
    schemeIncludes: "mid-cap",
    section: "benchmark",
  },
  {
    category: "benchmark",
    query: "What is the benchmark index for HDFC Large and Mid Cap Fund?",
    schemeIncludes: "large-and-mid-cap",
    section: "benchmark",
  },
  {
    category: "benchmark",
    query: "Benchmark for HDFC Defence Fund Direct Growth",
    schemeIncludes: "defence",
    section: "benchmark",
  },
  {
    category: "fund_management",
    query: "Who manages HDFC Mid Cap Fund Direct Growth?",
    schemeIncludes: "mid-cap",
    section: "fund_management",
  },
  {
    category: "fund_management",
    query: "Fund manager of HDFC Large and Mid Cap Fund Direct Growth",
    schemeIncludes: "large-and-mid-cap",
    section: "fund_management",
  },
  {
    category: "fund_management",
    query: "Who manages HDFC Small Cap Fund Direct Growth?",
    schemeIncludes: "small-cap",
    section: "fund_management",
  },
  {
    category: "fund_management",
    query: "Who manages HDFC Gold ETF Fund of Fund Direct Plan Growth?",
    schemeIncludes: "gold-etf",
    section: "fund_management",
  },
  {
    category: "fund_management",
    query: "Fund managers for HDFC Defence Fund Direct Growth",
    schemeIncludes: "defence",
    section: "fund_management",
  },
];

export const COMPLIANCE_MATRIX: ComplianceMatrixCase[] = [
  {
    category: "advisory",
    query: "Should I invest in HDFC Mid Cap Fund?",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "advisory",
    query: "Is HDFC Defence Fund a good investment?",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "advisory",
    query: "Would you recommend HDFC Nifty 50 Index Fund?",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "advisory",
    query: "Is it worth buying HDFC Small Cap Fund now?",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "advisory",
    query: "Should I invest in HDFC Gold ETF FoF?",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "comparison",
    query: "Which is better, mid cap or large cap?",
    expectRefusal: true,
    citationIncludes: "amfiindia.com",
  },
  {
    category: "comparison",
    query: "Compare HDFC Mid Cap and Small Cap funds",
    expectRefusal: true,
    citationIncludes: "amfiindia.com",
  },
  {
    category: "comparison",
    query: "Which fund is better: defence or gold ETF?",
    expectRefusal: true,
    citationIncludes: "amfiindia.com",
  },
  {
    category: "advisory",
    query: "Compare expense ratios and tell me which to buy",
    expectRefusal: true,
    citationIncludes: "sebi.gov.in",
  },
  {
    category: "performance",
    query: "What returns will I get in 3 years from HDFC Mid Cap Fund?",
    expectRefusal: true,
    citationIncludes: "groww.in/mutual-funds/hdfc-mid-cap",
  },
  {
    category: "performance",
    query: "Expected returns for HDFC Defence Fund",
    expectRefusal: true,
    citationIncludes: "groww.in/mutual-funds/hdfc-defence",
  },
];

export const ADVISORY_COMPARISON_MATRIX = COMPLIANCE_MATRIX.filter((item) =>
  ["advisory", "comparison"].includes(item.category),
);
