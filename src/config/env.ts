import dotenv from "dotenv";

dotenv.config();

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: Number(optional("PORT", "3000")),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  llmProvider: optional("LLM_PROVIDER", "groq"),
  llmModel: optional("LLM_MODEL", "llama-3.1-8b-instant"),
  embeddingModel: optional("EMBEDDING_MODEL", "Xenova/bge-small-en-v1.5"),
  chromaHost: optional("CHROMA_HOST", "http://localhost:8000"),
  ingestionScheduleHour: Number(optional("INGESTION_SCHEDULE_HOUR", "10")),
  ingestionScheduleMinute: Number(optional("INGESTION_SCHEDULE_MINUTE", "0")),
  ingestionScheduleTimezone: optional(
    "INGESTION_SCHEDULE_TIMEZONE",
    "Asia/Kolkata",
  ),
} as const;
