# RAG ChatBot — HDFC Mutual Fund FAQ Assistant

Facts-only mutual fund FAQ assistant for **five HDFC schemes** on Groww. Answers are grounded in ingested scheme pages, cite official sources, and refuse investment advice.

> **Disclaimer:** Facts-only. No investment advice.

## Features

- RAG pipeline: scheme resolution → section intent → Chroma retrieval → Groq generation
- Compliance layer: PII guard, advisory classifier, refusal templates, answer validation
- Daily ingestion from Groww `__NEXT_DATA__` JSON (not HTML scraping)
- Minimal chat UI at `http://localhost:3000`

## Corpus (HDFC Mutual Fund)

| Scheme | Category | Groww URL |
|--------|----------|-----------|
| HDFC Mid Cap Fund Direct Growth | Equity — Mid Cap | [groww.in/.../hdfc-mid-cap-fund-direct-growth](https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth) |
| HDFC Large Cap Fund Direct Growth | Equity — Large Cap | [groww.in/.../hdfc-large-cap-fund-direct-growth](https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth) |
| HDFC Small Cap Fund Direct Growth | Equity — Small Cap | [groww.in/.../hdfc-small-cap-fund-direct-growth](https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth) |
| HDFC Gold ETF Fund of Fund Direct Plan Growth | Commodities — Gold | [groww.in/.../hdfc-gold-etf-fund-of-fund-direct-plan-growth](https://groww.in/mutual-funds/hdfc-gold-etf-fund-of-fund-direct-plan-growth) |
| HDFC Defence Fund Direct Growth | Equity — Thematic (Defence) | [groww.in/.../hdfc-defence-fund-direct-growth](https://groww.in/mutual-funds/hdfc-defence-fund-direct-growth) |

Scheme list is defined in [`config/corpus.yaml`](./config/corpus.yaml).

## Architecture

See [architecture.md](./architecture.md) for the full system design (ingestion, embeddings, retrieval, API, compliance, scheduler).

High-level flow:

```
User question → PII guard → classifier → [refuse | RAG retrieve → LLM → validate → format] → response
```

## Prerequisites

- **Node.js** ≥ 20
- **Python 3** (for local Chroma server via venv)
- **Groq API key** ([console.groq.com](https://console.groq.com)) for LLM answers

## Quick start (local)

Estimated time: **15–25 minutes** on first run (embedding model download + ingestion).

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
GROQ_API_KEY=your_key_here
```

### 3. Start Chroma (Terminal 1)

One-time setup:

```bash
npm run chroma:setup
```

Start the server (keep running):

```bash
npm run chroma:server
```

Chroma listens on `http://localhost:8000` and persists to `data/index/chroma/`.

### 4. Build the index (Terminal 2)

```bash
npm run ingest
```

Fetches five Groww pages, chunks content (~51 chunks), embeds with BGE-small, and upserts into Chroma. Re-run after source changes or on schedule.

Skip re-fetch if raw HTML already exists:

```bash
npm run ingest -- --skip-fetch
```

Re-index only (processed chunks already on disk):

```bash
npm run ingest:index
```

### 5. Start API + UI (Terminal 2)

```bash
npm run dev
```

Open **http://localhost:3000** and try:

- “Who manages HDFC Mid Cap Fund?”
- “What is the expense ratio of HDFC Large Cap Fund?”
- “Should I invest in HDFC Small Cap?” (should refuse — advisory)

Health check: `GET http://localhost:3000/health`

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `GROQ_API_KEY` | — | Required for factual LLM answers |
| `LLM_PROVIDER` | `groq` | LLM provider |
| `LLM_MODEL` | `llama-3.1-8b-instant` | Groq model |
| `EMBEDDING_MODEL` | `Xenova/bge-small-en-v1.5` | Local embedding model |
| `CHROMA_HOST` | `http://localhost:8000` | Chroma HTTP endpoint |
| `INGESTION_SCHEDULE_HOUR` | `10` | Daily job hour (IST) |
| `INGESTION_SCHEDULE_MINUTE` | `0` | Daily job minute |
| `INGESTION_SCHEDULE_TIMEZONE` | `Asia/Kolkata` | Scheduler timezone |

## Ingestion & scheduler

### Manual

```bash
npm run ingest              # full pipeline
npm run ingest -- --skip-fetch
npm run ingest:index        # index only
```

### Daily scheduler (daemon)

Runs ingestion on a cron schedule (default **10:00 AM IST**). Chroma must be reachable at `CHROMA_HOST`.

```bash
npm run schedule            # daemon
npm run schedule:once       # single run (for cron / CI)
```

**Crontab example:** see [`crontab.example`](./crontab.example).

**GitHub Actions:** [`.github/workflows/daily-ingestion.yml`](./.github/workflows/daily-ingestion.yml) runs `schedule:once` on a schedule.

### Failed ingestion

See **[docs/RUNBOOK.md](./docs/RUNBOOK.md)** for step-by-step recovery (logs, Chroma health, manual re-run, index verification).

## Docker (optional)

Requires Docker Compose. Chroma runs as a separate container; the app uses `CHROMA_HOST=http://chroma:8000`.

```bash
cp .env.example .env
# set GROQ_API_KEY in .env

docker compose up -d chroma
docker compose run --rm app npm run ingest
docker compose up -d app
```

App: **http://localhost:3000**. Data is volume-mounted at `./data`.

Rebuild after code changes:

```bash
docker compose build app
docker compose up -d app
```

## Development & QA

```bash
npm test                    # 42 unit/integration tests
npm run retrieve:test       # retrieval probes (needs Chroma + index)
npm run qa:matrix           # 34-query evaluation (needs Chroma + GROQ_API_KEY)
npm run build && npm start  # production build
```

CI: [`.github/workflows/test.yml`](./.github/workflows/test.yml).

## Project layout

```
config/corpus.yaml     # AMC + 5 schemes
src/app/               # API, RAG, compliance, UI server
src/ingestion/         # fetch, parse, chunk, index
src/scheduler/         # daily cron
src/qa/                # evaluation matrix
ui/                    # static chat UI
data/raw/              # fetched HTML (gitignored)
data/processed/        # chunks + metadata
data/index/            # Chroma persistence (gitignored)
tests/                 # Vitest suites
```

## Known limitations

- **Corpus size:** Only the five Groww URLs in `config/corpus.yaml` — no other AMCs or schemes.
- **Source dependency:** Content comes from Groww scheme pages; layout or API changes may break parsing until ingestion is updated.
- **Refresh lag:** Index updates on manual ingest or daily schedule — not real-time.
- **Performance data:** Returns factsheet links rather than live NAV/returns commentary.
- **Local embeddings:** First query/ingest downloads ~130MB BGE-small model via Transformers.js.
- **LLM required:** Without `GROQ_API_KEY`, retrieval works but generation may fail or degrade.

## Success criteria

| Criterion | Status |
|-----------|--------|
| Accurate retrieval of factual mutual fund information, including fund management data | Verified (`npm run retrieve:test`, `npm run qa:matrix`) |
| Strict adherence to facts-only responses | Validator + evaluation matrix |
| Consistent inclusion of valid source citations | Formatter appends source URL + last updated |
| Proper refusal of advisory queries | Classifier + refusal templates + compliance tests |
| Clean, minimal, and user-friendly interface | `ui/` — Groww-inspired chat UI |

## Related docs

- [problemStatement.md](./problemStatement.md) — requirements and scope
- [architecture.md](./architecture.md) — technical design
- [implementation-plan.md](./implementation-plan.md) — phased build plan
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — ingestion failure runbook

## License

Private / educational project (see repository owner).
