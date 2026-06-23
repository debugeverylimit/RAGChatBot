# 💬 Mutual Fund FAQ Assistant (RAG)

A facts-only AI assistant that answers objective questions about HDFC Mutual Fund schemes using Retrieval-Augmented Generation (RAG).

> **Disclaimer:** Facts-only. No investment advice.

---

## Problem Statement

Retail investors often struggle to find trustworthy mutual fund information spread across multiple websites, scheme documents, and disclosures.

Existing chatbots may:

* Hallucinate information
* Provide investment advice
* Lack transparency about sources

This project solves that by providing:

✅ Factual, source-backed answers

✅ Single-source citations

✅ Strict refusal of investment advice

✅ Transparent and compliant responses

---

## Product Vision

Build a trustworthy mutual fund assistant that prioritizes:

* Accuracy over intelligence
* Compliance over recommendations
* Transparency over black-box responses

The assistant only answers objective, verifiable questions and never provides investment advice.

---

## Target Users

* Retail investors researching mutual funds
* Customer support teams handling repetitive FAQs
* Content and operations teams

---

## Key Features

* Facts-only question answering
* Source-backed responses with citations
* Retrieval-Augmented Generation (RAG)
* Advisory query refusal handling
* Daily corpus refresh pipeline
* Minimal chat interface
* PII guardrails and compliance checks

---

## Example Questions

✅ What is the expense ratio of HDFC Mid Cap Fund Direct Growth?

✅ Who manages HDFC Pharma and Healthcare Fund Direct Growth?

✅ What is the benchmark index of HDFC Balanced Advantage Fund Direct Growth?

❌ Should I invest in HDFC Small Cap Fund?

❌ Which fund is better: HDFC Mid Cap or HDFC Large Cap?

---

## Product Decisions

* Limited corpus to 15 HDFC scheme pages for MVP.
* Facts-only responses to ensure compliance.
* Single citation per answer to maximize trust and explainability.
* Maximum response length of 3 sentences for readability.
* Strict refusal handling for investment advice.

---

## Success Metrics

* Retrieval accuracy
* Citation accuracy
* Advisory refusal accuracy
* Response latency
* Corpus freshness

---

# 🏗 Architecture

```text
User Question
      ↓
PII Guard
      ↓
Intent Classifier
      ↓
 ┌──────────────┐
 │ Advisory?    │── Yes ──> Refusal Response
 └──────────────┘
      ↓ No
Retrieve Relevant Chunks
      ↓
Generate Answer with LLM
      ↓
Validate + Add Citation
      ↓
Final Response
```

---

## Tech Stack

### Backend

* Node.js
* TypeScript
* Express

### Vector Database

* ChromaDB (JS Client)

### Embeddings

* Xenova BGE Small (`bge-small-en-v1.5`)

### LLM

* Groq SDK
* Llama 3.1 8B Instant

### Deployment

* Local Chroma Server
* Express API

---

## Corpus (HDFC Mutual Fund)

| Scheme | Category |
|--------|----------|
| HDFC Silver ETF FoF Direct Growth | Commodities — Silver |
| HDFC Mid Cap Fund Direct Growth | Equity — Mid Cap |
| HDFC Equity Fund Direct Growth | Equity — Diversified |
| HDFC Defence Fund Direct Growth | Equity — Thematic (Defence) |
| HDFC Gold ETF Fund of Fund Direct Plan Growth | Commodities — Gold |
| HDFC Small Cap Fund Direct Growth | Equity — Small Cap |
| HDFC Nifty 50 Index Fund Direct Growth | Index — Nifty 50 |
| HDFC Balanced Advantage Fund Direct Growth | Hybrid — Balanced Advantage |
| HDFC Multi Cap Fund Direct Growth | Equity — Multi Cap |
| HDFC Pharma and Healthcare Fund Direct Growth | Equity — Sector |
| HDFC Focused Fund Direct Growth | Equity — Focused |
| HDFC Nifty Next 50 Index Fund Direct Growth | Index — Nifty Next 50 |
| HDFC Short Term Opportunities Fund Direct Growth | Debt — Short Term |
| HDFC BSE Sensex Index Fund Direct Growth | Index — BSE Sensex |
| HDFC Large and Mid Cap Fund Direct Growth | Equity — Large & Mid Cap |

Full URLs and aliases: [`config/corpus.yaml`](./config/corpus.yaml).

---


# 🚀 Getting Started

## Prerequisites

* Node.js 20+
* Python 3
* Groq API Key

---

## Installation

```bash
npm install
cp .env.example .env
```

Add your API key:

```env
GROQ_API_KEY=your_key_here
```

---

## Start Chroma

```bash
npm run chroma:setup
npm run chroma:server
```

---

## Ingest the Corpus

```bash
npm run ingest
```

---

## Start the Application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Environment Variables

| Variable        | Required |
| --------------- | -------- |
| GROQ_API_KEY    | Yes      |
| PORT            | No       |
| CHROMA_HOST     | No       |
| LLM_MODEL       | No       |
| EMBEDDING_MODEL | No       |

---

# Development Commands

```bash
npm test
npm run retrieve:test
npm run qa:matrix
npm run build
npm start
```

---

# Ingestion & Scheduling

```bash
npm run ingest
npm run ingest -- --skip-fetch
npm run ingest:index
npm run schedule:once
npm run schedule
```

---

# Known Limitations

* Corpus is limited to 15 HDFC schemes.
* Data is refreshed periodically and is not real-time.
* Changes in Groww page structure may require scraper updates.
* First run downloads a local embedding model.

---

# Key Learnings

* Built an end-to-end RAG pipeline using Node.js and TypeScript.
* Improved retrieval accuracy by expanding the corpus from 5 to 15 schemes.
* Debugged ingestion, chunking, and verification issues.
* Designed compliance guardrails to prevent hallucinations and investment recommendations.
* Implemented source-backed responses to improve user trust and transparency.

---

# Repository Structure

```text
src/
├── api
├── ingest
├── rag
├── scheduler
├── ui
└── utils

config/
└── corpus.yaml

docs/
├── architecture.md
├── implementation-plan.md
└── RUNBOOK.md
```

---

## Author

**Manjari Vishwakarma**

Product Manager | Data & AI Enthusiast


