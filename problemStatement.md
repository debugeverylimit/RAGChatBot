# Problem Statement: Mutual Fund FAQ Assistant (Facts-Only Q&A)

## Overview

The objective of this project is to build a **facts-only FAQ assistant** for mutual fund schemes, using **Groww** as the reference product context. The assistant will answer objective, verifiable queries related to mutual funds by retrieving information exclusively from official public sources, such as AMC (Asset Management Company) websites, AMFI, and SEBI.

The system must strictly avoid providing investment advice, opinions, or recommendations. Every response must include a single, clear source link and adhere to defined constraints around clarity, accuracy, and compliance.

## Objective

Design and implement a lightweight **Retrieval-Augmented Generation (RAG)**-based assistant that:

- Answers factual queries about mutual fund schemes
- Uses a curated corpus of official documents
- Provides concise, source-backed responses

**Technology stack:** Node.js + TypeScript, Express, ChromaDB (JS client), local BGE-small embeddings (`@xenova/transformers`), and Groq LLM (`groq-sdk`). See [architecture.md](./architecture.md) and [implementation-plan.md](./implementation-plan.md) for details.

## Target Users

- Retail investors comparing mutual fund schemes
- Customer support and content teams handling repetitive mutual fund queries

## Scope of Work

### 1. Corpus Definition

**Selected AMC:** [HDFC Mutual Fund](http://www.hdfcfund.com)

For the current phase, the corpus is limited to **5 Groww scheme pages** (reference product context). Each page serves as the source for factual scheme data such as expense ratio, exit load, minimum SIP, risk classification, benchmark, tax implications, and **fund management** details (fund manager names, tenure, education, and professional experience).

| # | Scheme | URL |
|---|--------|-----|
| 1 | HDFC Mid Cap Fund Direct Growth | https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth |
| 2 | HDFC Large Cap Fund Direct Growth | https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth |
| 3 | HDFC Small Cap Fund Direct Growth | https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth |
| 4 | HDFC Gold ETF Fund of Fund Direct Plan Growth | https://groww.in/mutual-funds/hdfc-gold-etf-fund-of-fund-direct-plan-growth |
| 5 | HDFC Defence Fund Direct Growth | https://groww.in/mutual-funds/hdfc-defence-fund-direct-growth |

**Scheme coverage:**

- **Equity — Mid Cap:** HDFC Mid Cap Fund Direct Growth
- **Equity — Large Cap:** HDFC Large Cap Fund Direct Growth
- **Equity — Small Cap:** HDFC Small Cap Fund Direct Growth
- **Equity — Thematic (Defence):** HDFC Defence Fund Direct Growth
- **Commodities — Gold:** HDFC Gold ETF Fund of Fund Direct Plan Growth

> **Note:** The original brief allowed a broader corpus (15–25 official URLs from AMC, AMFI, and SEBI). This implementation intentionally narrows scope to the five URLs above for initial development and evaluation.

### 2. FAQ Assistant Requirements

The assistant must answer **facts-only** queries, such as:

| Query Type | Example |
|------------|---------|
| Expense ratio | Expense ratio of a scheme |
| Exit load | Exit load details |
| Minimum investment | Minimum SIP amount |
| Lock-in period | ELSS lock-in period |
| Risk classification | Riskometer classification |
| Benchmark | Benchmark index |
| Fund management | Who manages HDFC Defence Fund? |
| Fund manager details | What is the experience of the fund manager of HDFC Mid Cap Fund? |
| Document access | Process to download statements or capital gains reports |

**Response requirements:**

- Each response is limited to a **maximum of 3 sentences**
- Each response includes **exactly one citation link**
- Each response includes a footer:
  ```
  Last updated from sources: <date>
  ```

### 3. Refusal Handling

The assistant must refuse non-factual or advisory queries, such as:

- *"Should I invest in this fund?"*
- *"Which fund is better?"*

Refusal responses should:

- Be polite and clearly worded
- Reinforce the facts-only limitation
- Provide a relevant educational link (e.g., AMFI or SEBI resource)

### 4. User Interface (Minimal)

The solution should include a simple interface with:

- A welcome message
- Three example questions
- A visible disclaimer:
  > **Facts-only. No investment advice.**

## Constraints

### Data and Sources

- The active corpus is limited to the **5 Groww scheme URLs** listed in [Corpus Definition](#1-corpus-definition)
- Responses must cite one of these source URLs (or an official AMC/AMFI/SEBI link when refusing advisory queries)
- Do not use third-party blogs or other aggregator websites beyond the defined corpus

### Privacy and Security

Do not collect, store, or process:

- PAN or Aadhaar numbers
- Account numbers
- OTPs
- Email addresses or phone numbers

### Content Restrictions

- No investment advice or recommendations
- No performance comparisons or return calculations
- For performance-related queries, provide a link to the official factsheet only

### Transparency

- Responses must be short, factual, and verifiable
- Every answer must include a source link and last updated date

## Expected Deliverables

### README Document

- Setup instructions (`npm install`, env vars, Chroma server, run)
- Selected AMC (**HDFC Mutual Fund**) and the **5 schemes** in the corpus
- Architecture overview (RAG approach; link to [architecture.md](./architecture.md))
- How to run ingestion manually (`npm run ingest`) and via daily scheduler
- Known limitations (including corpus limited to 5 Groww URLs)

### Disclaimer Snippet

```
Facts-only. No investment advice.
```

## Success Criteria

- [x] Accurate retrieval of factual mutual fund information, including fund management data
- [x] Strict adherence to facts-only responses
- [x] Consistent inclusion of valid source citations
- [x] Proper refusal of advisory queries
- [x] Clean, minimal, and user-friendly interface

## Summary

The goal is to build a **trustworthy, transparent, and compliant** mutual fund FAQ assistant that prioritizes accuracy over intelligence. The system should ensure that users receive only verified, source-backed financial information, without any advisory bias or speculative content.

Implementation is delivered as a **Node.js + TypeScript** application with an Express API, a minimal HTML chat UI, a daily ingestion pipeline, and a Chroma-backed vector index refreshed from the five Groww scheme pages.
