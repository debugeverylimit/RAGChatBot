import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app/createApp.js";

const app = createApp();

describe("POST /api/chat", () => {
  it("rejects empty message", async () => {
    const response = await request(app).post("/api/chat").send({ message: "  " });
    expect(response.status).toBe(400);
  });

  it("returns structured response for ambiguous query without Groq", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "expense ratio" });

    if (response.status === 503) {
      expect(response.body.error).toMatch(/Chroma|GROQ/);
      return;
    }

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      answer: expect.any(String),
      citation_url: expect.stringMatching(/^https:\/\//),
      last_updated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      is_refusal: false,
      disclaimer: "Facts-only. No investment advice.",
    });
    expect(response.body.answer.toLowerCase()).toContain("scheme");
    expect(response.body.answer).toContain("Last updated from sources:");
  });

  it("refuses advisory queries before RAG", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "Should I invest in HDFC Mid Cap Fund?" });

    expect(response.status).toBe(200);
    expect(response.body.is_refusal).toBe(true);
    expect(response.body.citation_url).toBe(
      "https://investor.sebi.gov.in/",
    );
  });

  it("rejects PII in user message", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "My PAN is ABCDE1234F, should I invest?" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/privacy/i);
  });

  it("refuses comparison queries before RAG", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "Which is better, mid cap or large cap?" });

    expect(response.status).toBe(200);
    expect(response.body.is_refusal).toBe(true);
    expect(response.body.citation_url).toContain("amfiindia.com");
    expect(response.body.answer).toContain("Last updated from sources:");
  });

  it("refuses performance queries with scheme link when named", async () => {
    const response = await request(app)
      .post("/api/chat")
      .send({ message: "What returns will I get in 3 years from HDFC Mid Cap Fund?" });

    expect(response.status).toBe(200);
    expect(response.body.is_refusal).toBe(true);
    expect(response.body.citation_url).toContain("hdfc-mid-cap-fund-direct-growth");
  });
});

describe("GET /", () => {
  it("serves the chat UI", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("HDFC Mutual Fund FAQ Assistant");
    expect(response.text).toContain("Facts-only. No investment advice.");
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
