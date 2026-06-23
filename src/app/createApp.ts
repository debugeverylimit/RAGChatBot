import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleChat } from "./chatPipeline.js";
import { PiiRejectedError } from "./piiGuard.js";
import { chatRequestSchema, chatResponseSchema } from "./schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.resolve(__dirname, "../../ui");

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(UI_DIR));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "mutual-fund-faq-assistant",
    });
  });

  app.post("/api/chat", async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { message } = parsed.data;

    try {
      const response = await handleChat(message);
      const validated = chatResponseSchema.parse(response);
      res.json(validated);
    } catch (error) {
      if (error instanceof PiiRejectedError) {
        res.status(400).json({ error: error.message });
        return;
      }

      const messageText =
        error instanceof Error ? error.message : "Unexpected server error";

      if (messageText.includes("GROQ_API_KEY")) {
        res.status(503).json({ error: messageText });
        return;
      }

      if (messageText.includes("Chroma server unreachable")) {
        res.status(503).json({ error: messageText });
        return;
      }

      console.error("POST /api/chat failed:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  return app;
}
