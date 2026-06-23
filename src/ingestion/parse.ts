import fs from "node:fs/promises";
import { getSchemeBySlug } from "../lib/corpus.js";
import {
  cleanedTextPath,
  processedDir,
  sectionsPath,
} from "../lib/paths.js";
import type {
  FundManagerDetail,
  GrowwSchemeData,
  ParsedScheme,
  SectionRecord,
  SectionTag,
} from "../lib/types.js";
import { SECTION_TAGS } from "../lib/types.js";
import { getLatestFetchDate, readRawHtml } from "./fetch.js";

export function extractGrowwData(html: string): GrowwSchemeData {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("Could not find __NEXT_DATA__ in Groww page HTML");
  }

  const nextData = JSON.parse(match[1]) as {
    props?: { pageProps?: { mfServerSideData?: GrowwSchemeData } };
  };

  const data = nextData.props?.pageProps?.mfServerSideData;
  if (!data) {
    throw new Error("Could not find mfServerSideData in __NEXT_DATA__");
  }

  return data;
}

function formatManagerDate(iso?: string): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatLockIn(lockIn?: GrowwSchemeData["lock_in"]): string {
  if (!lockIn) return "No lock-in period.";
  const parts: string[] = [];
  if (lockIn.years) parts.push(`${lockIn.years} year(s)`);
  if (lockIn.months) parts.push(`${lockIn.months} month(s)`);
  if (lockIn.days) parts.push(`${lockIn.days} day(s)`);
  return parts.length ? parts.join(", ") : "No lock-in period.";
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildOverview(data: GrowwSchemeData): string {
  const lines = [
    `Category: ${data.category ?? "N/A"}${data.sub_category ? ` — ${data.sub_category}` : ""}`,
    `AUM: ₹${data.aum?.toLocaleString("en-IN") ?? "N/A"} Cr`,
    `NAV: ₹${data.nav ?? "N/A"} (as of ${data.nav_date ?? "N/A"})`,
    `Groww rating: ${data.groww_rating ?? "N/A"}/5`,
    `Risk classification: ${data.nfo_risk || "As per Riskometer on scheme page"}`,
    `Lock-in: ${formatLockIn(data.lock_in)}`,
  ];
  return lines.join("\n");
}

function buildExpenseRatio(data: GrowwSchemeData): string {
  const ratio = data.expense_ratio ?? "N/A";
  let text = `Expense ratio: ${ratio}% (Direct Growth plan).`;
  if (data.historic_fund_expense) {
    text += `\nHistoric expense data is available on the scheme page.`;
  }
  return text;
}

function buildExitLoad(data: GrowwSchemeData): string {
  let text = data.exit_load?.trim() || "Exit load details not available on scheme page.";
  if (data.historic_exit_loads) {
    text += "\nHistoric exit load rules may apply for older investments.";
  }
  return text;
}

function buildMinimumInvestment(data: GrowwSchemeData): string {
  const lines = [
    `Minimum SIP: ₹${data.min_sip_investment ?? "N/A"}`,
    `Minimum lumpsum investment: ₹${data.min_investment_amount ?? "N/A"}`,
    `Additional investment (minimum): ₹${data.mini_additional_investment ?? "N/A"}`,
    `SIP multiplier: ₹${data.sip_multiplier ?? "N/A"}`,
  ];
  if (data.max_sip_investment) {
    lines.push(`Maximum SIP: ₹${data.max_sip_investment}`);
  }
  return lines.join("\n");
}

function buildBenchmark(data: GrowwSchemeData): string {
  const primary = data.benchmark ?? "N/A";
  const fullName = data.benchmark_name;
  return fullName && fullName !== primary
    ? `Benchmark: ${primary}\nFull name: ${fullName}`
    : `Benchmark: ${primary}`;
}

function buildTax(data: GrowwSchemeData): string {
  const lines = [`Stamp duty: ${data.stamp_duty ?? "N/A"}`];
  if (data.dividend) {
    lines.push(`Dividend option: ${JSON.stringify(data.dividend)}`);
  }
  lines.push(
    "Equity mutual funds: STCG tax applies on units held ≤12 months; LTCG tax applies on gains above exemption limit for units held >12 months. Debt fund taxation varies by holding period and acquisition date. Refer to the scheme page and latest tax rules for exact rates.",
  );
  return lines.join("\n");
}

export function buildManagerBio(manager: FundManagerDetail): string {
  const name = manager.person_name ?? "Unknown";
  const since = formatManagerDate(manager.date_from);
  const lines = [`${name} — Fund Manager, since ${since}`];

  if (manager.education) {
    lines.push(`Education: ${manager.education.trim()}`);
  }
  if (manager.experience) {
    lines.push(`Experience: ${manager.experience.trim()}`);
  }

  return lines.join("\n");
}

function buildFundManagement(data: GrowwSchemeData): string {
  const managers = data.fund_manager_details ?? [];
  if (managers.length === 0) {
    const fallback = data.fund_manager?.trim();
    return fallback
      ? `Fund manager(s): ${fallback}`
      : "Fund manager details not available on scheme page.";
  }

  return managers.map(buildManagerBio).join("\n\n");
}

function buildInvestmentObjective(data: GrowwSchemeData): string {
  return (
    data.description?.trim() ||
    "Investment objective not available on scheme page."
  );
}

function buildFundHouse(data: GrowwSchemeData): string {
  const amc = data.amc_info;
  const lines = [
    `Fund house: ${data.fund_house ?? amc?.name ?? "N/A"}`,
    `Registrar: ${data.registrar_agent ?? "N/A"}`,
  ];

  if (amc?.address) lines.push(`Address: ${amc.address}`);
  if (amc?.phone) lines.push(`Phone: ${amc.phone}`);
  if (amc?.email) lines.push(`Email: ${amc.email}`);
  if (amc?.launch_date) {
    lines.push(`AMC launch date: ${formatManagerDate(amc.launch_date)}`);
  }
  if (amc?.description) {
    lines.push(`About AMC: ${stripHtml(amc.description)}`);
  }

  return lines.join("\n");
}

function buildSections(data: GrowwSchemeData): SectionRecord {
  const sections = {} as SectionRecord;

  const builders: Record<SectionTag, () => string> = {
    overview: () => buildOverview(data),
    expense_ratio: () => buildExpenseRatio(data),
    exit_load: () => buildExitLoad(data),
    minimum_investment: () => buildMinimumInvestment(data),
    benchmark: () => buildBenchmark(data),
    tax: () => buildTax(data),
    fund_management: () => buildFundManagement(data),
    investment_objective: () => buildInvestmentObjective(data),
    fund_house: () => buildFundHouse(data),
  };

  for (const tag of SECTION_TAGS) {
    sections[tag] = builders[tag]();
  }

  return sections;
}

function buildCleanedText(schemeName: string, sections: SectionRecord): string {
  return SECTION_TAGS.map(
    (tag) => `## ${tag}\n${sections[tag]}`,
  ).join("\n\n").replace(/^/m, `# ${schemeName}\n\n`);
}

export async function parseScheme(slug: string): Promise<ParsedScheme> {
  const scheme = getSchemeBySlug(slug);
  const html = await readRawHtml(slug);
  const data = extractGrowwData(html);
  const lastUpdated = await getLatestFetchDate(slug);
  const sections = buildSections(data);

  const parsed: ParsedScheme = {
    slug: scheme.slug,
    scheme_name: data.scheme_name ?? scheme.scheme_name,
    source_url: scheme.source_url,
    category: scheme.category,
    last_updated: lastUpdated,
    sections,
  };

  const outDir = processedDir(slug);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(sectionsPath(slug), JSON.stringify(sections, null, 2), "utf8");
  await fs.writeFile(
    cleanedTextPath(slug),
    buildCleanedText(parsed.scheme_name, sections),
    "utf8",
  );

  return parsed;
}

export async function parseAllSchemes(): Promise<ParsedScheme[]> {
  const { loadCorpus } = await import("../lib/corpus.js");
  const corpus = loadCorpus();
  const results: ParsedScheme[] = [];

  for (const scheme of corpus.schemes) {
    try {
      console.log(`Parsing ${scheme.slug}...`);
      results.push(await parseScheme(scheme.slug));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to parse ${scheme.slug}: ${message}`);
    }
  }

  console.log(`Parsed ${results.length}/${corpus.schemes.length} schemes.`);
  return results;
}

