# Ingestion Runbook

Use this when daily ingestion fails, the index is stale, or chat answers cite outdated data.

## Symptoms

- Scheduler logs error or non-zero exit code
- `npm run ingest` fails mid-run
- Chat returns “no relevant information” for known factual queries
- `GET /health` reports Chroma or index issues
- `data/index/active.json` has an old `indexedAt` timestamp

## Quick recovery (most cases)

```bash
# Terminal 1 — ensure Chroma is running
npm run chroma:server

# Terminal 2 — full re-ingest
npm run ingest
```

Verify:

```bash
npm run retrieve:test
curl -s http://localhost:3000/health | jq .
```

## Step-by-step diagnosis

### 1. Check scheduler / cron logs

**Daemon:**

```bash
npm run schedule:once
```

**Crontab:** inspect `logs/ingestion.log` (path from [`crontab.example`](../crontab.example)).

**GitHub Actions:** open the `daily-ingestion` workflow run in the Actions tab.

Note the first error line — common categories below.

### 2. Verify Chroma is reachable

```bash
curl -s http://localhost:8000/api/v1/heartbeat
```

Expected: HTTP 200. If connection refused:

```bash
npm run chroma:setup   # first time only
npm run chroma:server  # keep running
```

Confirm `CHROMA_HOST` in `.env` matches (default `http://localhost:8000`).

### 3. Check Groww fetch failures

Ingestion fetches five URLs from [`config/corpus.yaml`](../config/corpus.yaml). Network or rate limits can fail individual schemes.

```bash
npm run ingest
```

If fetch fails but you have cached HTML under `data/raw/`:

```bash
npm run ingest -- --skip-fetch
```

Inspect per-scheme artifacts:

```bash
ls -la data/raw/
ls -la data/processed/*/chunks.json
```

Each of the five slugs should have `chunks.json` with non-empty `chunks` array.

### 4. Re-index without re-fetch

When `data/processed/` is valid but Chroma is empty or corrupted:

```bash
npm run ingest:index
```

This re-embeds and upserts from existing processed chunks.

### 5. Verify active index metadata

```bash
cat data/index/active.json
cat data/processed/metadata.json
```

Check `indexedAt`, `chunkCount`, and `collectionName` are recent and consistent.

### 6. Test retrieval

```bash
npm run retrieve:test
```

All probes should pass. For broader coverage:

```bash
npm run qa:matrix
```

Requires `GROQ_API_KEY` for generation checks; retrieval-only failures appear without it.

### 7. Nuclear reset (last resort)

Only if Chroma data is corrupted and re-index fails:

```bash
# Stop chroma:server (Ctrl+C)
rm -rf data/index/chroma
npm run chroma:server   # fresh Chroma data dir
npm run ingest          # full rebuild
```

`data/processed/` and `data/raw/` can be kept unless parsing logic changed.

## Error reference

| Error / symptom | Likely cause | Fix |
|-----------------|--------------|-----|
| `ECONNREFUSED` to port 8000 | Chroma not running | `npm run chroma:server` |
| Fetch timeout / 403 / 5xx | Groww unavailable or blocked | Retry; use `--skip-fetch` if raw cache exists |
| `mfServerSideData` parse error | Groww page structure changed | Update `src/ingestion/parse.ts`; re-fetch |
| Embedding / model download error | No disk space or network | Free space; retry ingest |
| Chroma upsert error | Stale collection / version mismatch | `ingest:index` or nuclear reset |
| Scheduler silent failure | Wrong cwd in crontab | Use absolute path in crontab (see example) |

## Post-recovery checklist

- [ ] `npm run chroma:server` running (or Docker `chroma` service up)
- [ ] `npm run ingest` completed without errors
- [ ] `data/index/active.json` timestamp updated
- [ ] `npm run retrieve:test` passes
- [ ] Sample chat query returns cited factual answer
- [ ] Scheduler / cron / GitHub Action re-enabled if paused

## Escalation

If Groww schema changes break parsing:

1. Save a failing `data/raw/<slug>.html`
2. Inspect `__NEXT_DATA__` JSON in the HTML
3. Patch `src/ingestion/parse.ts` and add/adjust tests
4. Full `npm run ingest` and `npm run qa:matrix`
