import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required").max(1000),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  citation_url: z.string().url(),
  last_updated: z.string(),
  is_refusal: z.boolean(),
  disclaimer: z.string(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const DISCLAIMER = "Facts-only. No investment advice.";

export const AMFI_EDUCATION_URL =
  "https://www.amfiindia.com/investor/knowledge-center-info?faqs";

export const SEBI_EDUCATION_URL = "https://investor.sebi.gov.in/";
