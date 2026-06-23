import { corpusScopePhrase } from "../lib/corpus.js";
import { resolveScheme } from "./schemeResolver.js";
import {
  AMFI_EDUCATION_URL,
  DISCLAIMER,
  SEBI_EDUCATION_URL,
  type ChatResponse,
} from "./schemas.js";
import type { QueryLabel } from "./classifier.js";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildRefusalResponse(partial: {
  answer: string;
  citation_url: string;
  is_refusal: boolean;
}): ChatResponse {
  return {
    answer: partial.answer,
    citation_url: partial.citation_url,
    last_updated: todayIsoDate(),
    is_refusal: partial.is_refusal,
    disclaimer: DISCLAIMER,
  };
}

export async function buildRefusal(
  label: QueryLabel,
  message: string,
): Promise<ChatResponse> {
  if (label === "performance") {
    const resolution = await resolveScheme(message);
    if (resolution.status === "resolved") {
      return buildRefusalResponse({
        answer:
          "I cannot calculate or project returns. For historical performance and NAV-related facts, refer to the official scheme page.",
        citation_url: resolution.scheme.source_url,
        is_refusal: true,
      });
    }

    return buildRefusalResponse({
      answer:
        "I cannot calculate, compare, or project investment returns. For general mutual fund education, use the linked AMFI resource.",
      citation_url: AMFI_EDUCATION_URL,
      is_refusal: true,
    });
  }

  if (label === "comparison") {
    return buildRefusalResponse({
      answer:
        "I cannot compare funds or say which option is better. I can answer factual questions such as expense ratio, exit load, benchmark, minimum SIP, or fund manager details for one named HDFC scheme.",
      citation_url: AMFI_EDUCATION_URL,
      is_refusal: true,
    });
  }

  return buildRefusalResponse({
    answer:
      `I can only answer factual questions about the ${corpusScopePhrase()} in my corpus, such as expense ratio, exit load, or fund manager details. I cannot provide investment advice or recommend whether to invest.`,
    citation_url: SEBI_EDUCATION_URL,
    is_refusal: true,
  });
}
