import { corpusScopePhrase } from "../lib/corpus.js";
import { generateAnswer } from "./generator.js";
import { retrieve } from "./retriever.js";
import {
  AMFI_EDUCATION_URL,
  DISCLAIMER,
  type ChatResponse,
} from "./schemas.js";
import type { RetrievedChunk } from "../lib/types.js";

export type RagDraft = ChatResponse & {
  _chunks?: RetrievedChunk[];
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildResponse(partial: {
  answer: string;
  citation_url: string;
  last_updated: string;
  is_refusal: boolean;
  chunks?: RetrievedChunk[];
}): RagDraft {
  return {
    answer: partial.answer,
    citation_url: partial.citation_url,
    last_updated: partial.last_updated,
    is_refusal: partial.is_refusal,
    disclaimer: DISCLAIMER,
    _chunks: partial.chunks,
  };
}

function logRetrieval(message: string, retrieval: Awaited<ReturnType<typeof retrieve>>): void {
  console.log(
    JSON.stringify({
      query: message,
      status: retrieval.status,
      schemeName: retrieval.schemeName,
      chunkIds: retrieval.chunks.map((chunk) => chunk.id),
    }),
  );
}

export async function runRag(message: string): Promise<RagDraft> {
  const retrieval = await retrieve(message);
  logRetrieval(message, retrieval);

  switch (retrieval.status) {
    case "ok": {
      const answer = await generateAnswer(message, retrieval);
      return buildResponse({
        answer,
        citation_url: retrieval.sourceUrl!,
        last_updated: retrieval.lastUpdated ?? todayIsoDate(),
        is_refusal: false,
        chunks: retrieval.chunks,
      });
    }

    case "ambiguous_scheme":
      return buildResponse({
        answer:
          retrieval.message ??
          "Please name one of the supported HDFC schemes so I can answer with a source-backed fact.",
        citation_url: AMFI_EDUCATION_URL,
        last_updated: todayIsoDate(),
        is_refusal: false,
      });

    case "out_of_scope":
      return buildResponse({
        answer:
          retrieval.message ??
          `I can only answer factual questions about the ${corpusScopePhrase()} in my corpus.`,
        citation_url: AMFI_EDUCATION_URL,
        last_updated: todayIsoDate(),
        is_refusal: true,
      });

    case "insufficient_context":
      return buildResponse({
        answer:
          retrieval.message ??
          `I could not find enough indexed context for ${retrieval.schemeName ?? "that scheme"}. Please check the official scheme page.`,
        citation_url: retrieval.sourceUrl ?? AMFI_EDUCATION_URL,
        last_updated: retrieval.lastUpdated ?? todayIsoDate(),
        is_refusal: false,
      });

    default:
      return buildResponse({
        answer: "Unable to process this query.",
        citation_url: AMFI_EDUCATION_URL,
        last_updated: todayIsoDate(),
        is_refusal: true,
      });
  }
}
