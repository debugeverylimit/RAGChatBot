import Groq from "groq-sdk";
import { env } from "../config/env.js";
import type { RetrievalResult } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a facts-only mutual fund FAQ assistant for five HDFC schemes on Groww.

Rules:
- Answer ONLY using the provided context chunks. Do not infer beyond them.
- Maximum 3 short sentences.
- Do not give investment advice, recommendations, or performance comparisons.
- Do not mention buying, selling, or holding units.
- Do not include URLs in the answer.
- If context is insufficient, say so briefly and refer the user to the official scheme page.
- Use plain, precise language suitable for retail investors.`;

function getClient(): Groq {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey: env.groqApiKey });
}

function buildUserPrompt(query: string, retrieval: RetrievalResult): string {
  const contextBlocks = retrieval.chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1} | section=${chunk.section}]\n${chunk.text}`,
    )
    .join("\n\n");

  return `Scheme: ${retrieval.schemeName}
Source URL: ${retrieval.sourceUrl}
Last updated: ${retrieval.lastUpdated}

Context:
${contextBlocks}

Question: ${query}

Write a factual answer in at most 3 sentences using only the context above.`;
}

function trimToThreeSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, 3).join(" ").trim();
}

export async function generateAnswer(
  query: string,
  retrieval: RetrievalResult,
): Promise<string> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: env.llmModel,
    temperature: 0.1,
    max_tokens: 220,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(query, retrieval) },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq returned an empty completion");
  }

  return trimToThreeSentences(content);
}
