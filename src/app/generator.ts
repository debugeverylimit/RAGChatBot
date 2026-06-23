import Groq from "groq-sdk";
import { env } from "../config/env.js";
import { corpusScopePhrase } from "../lib/corpus.js";
import type { RetrievalResult } from "../lib/types.js";

const SYSTEM_PROMPT = `You are a facts-only mutual fund FAQ assistant for ${corpusScopePhrase()} on Groww.

Rules:
- Answer ONLY using the provided context chunks. Do not infer beyond them.
- Maximum 3 short sentences.
- Do not give investment advice, recommendations, or performance comparisons.
- Do not mention buying, selling, or holding units.
- Do not include URLs in the answer.
- If the context contains the fact (expense ratio, exit load, minimum SIP, benchmark, fund manager, risk, etc.), state it clearly with the exact values from context.
- If context is insufficient or the fact is missing, say exactly: "I don't know based on the available sources."
- Never invent numbers, names, or dates not present in the context.
- Use plain, precise language suitable for retail investors.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
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

Write a factual answer in at most 3 sentences using only the context above. Quote exact values when present.`;
}

export function buildLlmPrompt(
  query: string,
  retrieval: RetrievalResult,
): { system: string; user: string } {
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(query, retrieval),
  };
}

function getClient(): Groq {
  if (!env.groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey: env.groqApiKey });
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
