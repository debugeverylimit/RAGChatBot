import { embedQuery } from "../lib/embeddings.js";
import { buildLlmPrompt, getSystemPrompt } from "./generator.js";
import { retrieve } from "./retriever.js";

export async function debugQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Query parameter q is required");
  }

  const embedding = await embedQuery(trimmed);
  const retrieval = await retrieve(trimmed);
  const { system, user } = buildLlmPrompt(trimmed, retrieval);

  return {
    query: trimmed,
    embedding: {
      dimensions: embedding.length,
      preview: embedding.slice(0, 12).map((v) => Number(v.toFixed(6))),
    },
    retrieval: {
      status: retrieval.status,
      schemeName: retrieval.schemeName,
      sourceUrl: retrieval.sourceUrl,
      lastUpdated: retrieval.lastUpdated,
      message: retrieval.message ?? null,
      chunks: retrieval.chunks.map((chunk) => ({
        id: chunk.id,
        section: chunk.section,
        distance: chunk.distance,
        similarity: Number((1 - chunk.distance).toFixed(4)),
        managerName: chunk.managerName,
        metadata: {
          section: chunk.section,
          managerName: chunk.managerName,
        },
        textPreview: chunk.text.slice(0, 400),
        text: chunk.text,
      })),
    },
    selectedContext: retrieval.chunks.map((chunk) => chunk.text).join("\n\n"),
    prompt: {
      system,
      user,
    },
  };
}

export function getDebugSystemPrompt(): string {
  return getSystemPrompt();
}
