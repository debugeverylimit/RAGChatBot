export const SECTION_TAGS = [
  "overview",
  "expense_ratio",
  "exit_load",
  "minimum_investment",
  "benchmark",
  "tax",
  "fund_management",
  "investment_objective",
  "fund_house",
] as const;

export type SectionTag = (typeof SECTION_TAGS)[number];

export type SchemeConfig = {
  slug: string;
  scheme_name: string;
  category: string;
  source_url: string;
  aliases: string[];
};

export type CorpusConfig = {
  amc: string;
  amc_url: string;
  schemes: SchemeConfig[];
};

export type FetchMeta = {
  slug: string;
  source_url: string;
  fetched_at: string;
  status: number;
  content_type: string | null;
};

export type SectionRecord = Record<SectionTag, string>;

export type ParsedScheme = {
  slug: string;
  scheme_name: string;
  source_url: string;
  category: string;
  last_updated: string;
  sections: SectionRecord;
};

export type ChunkRecord = {
  id: string;
  text: string;
  scheme_name: string;
  source_url: string;
  section: SectionTag;
  last_updated: string;
  manager_name?: string;
  token_estimate: number;
};

export type FundManagerDetail = {
  person_name?: string;
  date_from?: string;
  education?: string;
  experience?: string;
  funds_managed?: unknown[];
};

export type GrowwSchemeData = {
  scheme_name?: string;
  category?: string;
  sub_category?: string;
  super_category?: string;
  aum?: number;
  nav?: number;
  nav_date?: string;
  groww_rating?: number;
  nfo_risk?: string;
  lock_in?: { years?: number | null; months?: number | null; days?: number | null };
  expense_ratio?: string | number;
  historic_fund_expense?: unknown;
  exit_load?: string;
  historic_exit_loads?: unknown;
  min_sip_investment?: number;
  min_investment_amount?: number;
  mini_additional_investment?: number;
  sip_multiplier?: number;
  max_sip_investment?: number;
  benchmark?: string;
  benchmark_name?: string;
  stamp_duty?: string;
  dividend?: unknown;
  description?: string;
  fund_house?: string;
  registrar_agent?: string;
  fund_manager?: string;
  fund_manager_details?: FundManagerDetail[];
  amc_info?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    launch_date?: string;
    description?: string;
    aum?: number;
  };
};

export type SchemeMetadata = {
  slug: string;
  scheme_name: string;
  category: string;
  source_url: string;
  aliases: string[];
  last_fetched_at: string;
};

export type ActiveIndexPointer = {
  collection: string;
  updated_at: string;
};

export type QueryIndexResult = {
  ids: string[];
  documents: string[];
  metadatas: Record<string, string | number | boolean>[];
  distances: number[];
};

export type RetrievalStatus =
  | "ok"
  | "ambiguous_scheme"
  | "out_of_scope"
  | "insufficient_context";

export type RetrievedChunk = {
  id: string;
  text: string;
  section: string;
  distance: number;
  managerName: string | null;
};

export type RetrievalResult = {
  status: RetrievalStatus;
  schemeName: string | null;
  sourceUrl: string | null;
  lastUpdated: string | null;
  chunks: RetrievedChunk[];
  supportedSchemes?: string[];
  message?: string;
};

export type SchemeResolution =
  | { status: "resolved"; scheme: SchemeMetadata }
  | { status: "ambiguous"; candidates: SchemeMetadata[]; reason: string }
  | { status: "out_of_scope"; reason: string }
  | { status: "unresolved" };
