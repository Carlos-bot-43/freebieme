# Archived migration scripts

These are one-off scripts that were used to bootstrap or repair the dataset at various
points and are not part of the daily pipeline. Kept for reference / re-runnability,
but not invoked by CI.

| Script | Purpose | Last useful |
|---|---|---|
| `add-5-new-cities.js` | Bootstrap five new metro cities | one-shot |
| `add-new-cities.js`, `fetch-new-cities-74.js` | Bulk-add cities | one-shot |
| `add-new-chain-locations.js`, `inject-new-chains.js` | Add new chain coverage | one-shot |
| `apply-value-summary.js` | Backfill value summaries on existing deals | one-shot |
| `enrich-deals.js`, `enrich-rewards-descriptions.js` | LLM-style description enrichment | one-shot |
| `fix-source-urls.js` | Repair stale source URLs after chain redesigns | one-shot |
| `fix-sparse-cities.js`, `rescrape-sparse-cities.js` | Fill in cities with low location coverage | as needed |
| `rescrape-critical.js`, `rescrape2.js` | Selective re-scrape of high-priority chains | as needed |
| `generate-chain-coverage.js` | Coverage diagnostic report | as needed |
| `generate-synthetic-city-data.js` | Bootstrap synthetic data for cold-start cities | one-shot |

Anything referenced by `.github/workflows/*.yml` lives at the repo root, **not** here.
