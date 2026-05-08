# FreebieMe 🍔

Free food deal aggregator — birthday freebies, app deals, sign-up bonuses, and restaurant rewards, all in one place.

**Currently tracking:** 38 chains · 79 US cities · ~21k locations · 147 unique offers

## What it does

- Maintains a **normalized DB** of unique offers (chain × deal_type) with confidence + freshness signals
- Joins offers against location data from OpenStreetMap into per-city views
- Daily verification of source pages (HTTP + content-aware) with self-healing guards
- Coupon-aggregator pulls volatile deals from RetailMeNot, Slickdeals RSS, r/freebies
- Static Next.js frontend with location detection, deal filtering, schema.org offer markup
- Public read-only API: `/api/deals?chain=mcdonalds&deal_type=birthday`

## Architecture

```
┌─ source-of-truth (one file) ─────────────────────────────┐
│  data/normalized/db.json                                  │
│    ├── chains       (~38)                                 │
│    ├── deals        (~150 unique)                         │
│    ├── locations    (~21k)                                │
│    └── offers       (reserved for time-bounded LTOs)      │
└──────────────────────────────────────────────────────────┘
                       │
       ┌───────────────┴────────────────┐
       │                                │
┌──────▼─────────┐              ┌───────▼──────────────┐
│ Slim public DB │              │ Per-city legacy JSON │
│ ~220 KB        │              │ ~90 MB across 79     │
│ (chains+deals) │              │ files (deal × loc)   │
└──────┬─────────┘              └───────┬──────────────┘
       │                                │
       ▼                                ▼
  /chains/[slug]                  /deals/[city]
  /chains/[slug]/[city]           (existing — unchanged)
  /api/deals                      (back-compat)
```

The normalized DB is **534× smaller** than the flattened legacy data because the same offer (e.g. "Chick-fil-A birthday entrée") was previously stored once per location.

## Project structure

```
freebieme/
├── lib/
│   ├── schema.js               # Normalized schema (single source of truth)
│   ├── claim-steps.js          # Claim-flow metadata per chain
│   └── tag-deals.js            # Food-category tagging
├── scripts/
│   ├── build-normalized.js     # legacy per-city JSON → data/normalized/db.json
│   ├── build-public.js         # normalized → slim public DB + per-city JSON
│   └── migrations/             # Archived one-off migration scripts
├── scraper/
│   ├── sources/                # chain-rewards, osm-locations, coupon-aggregator
│   ├── parsers/                # deal-parser, confidence scorer
│   ├── baseline/               # Hand-curated known-deals.json (never scraped away)
│   └── utils/
├── data/
│   ├── chains.json             # 38 chain configs
│   ├── cities.json             # 79 US metros with bounding boxes
│   ├── normalized/db.json      # ⭐ source of truth
│   ├── last-good-run.json      # Latest pipeline metrics
│   ├── deal-status.md          # Daily status report
│   └── health-reports/         # Weekly verification reports
├── frontend/                   # Next.js 16, React 19, Tailwind 4, TS
│   ├── app/
│   │   ├── chains/[chain]/             # NEW — per-chain SEO page
│   │   ├── chains/[chain]/[city]/      # NEW — per-chain × city long-tail page
│   │   ├── api/deals/                  # NEW — public read API
│   │   ├── deals/[city]/               # Legacy city page (back-compat)
│   │   └── ...
│   ├── components/                     # DealCard now shows confidence + freshness
│   └── lib/
│       ├── normalized-types.ts         # TS mirror of lib/schema.js
│       ├── normalized-data.ts          # Server-only DB loader
│       ├── types.ts, data.ts           # Legacy
│       └── ...
└── .github/workflows/
    ├── deal-update.yml         # Daily 4 AM ET — verify + build
    ├── deal-health-check.yml   # Weekly Monday — content-aware verification
    └── scrape*.yml             # Disabled / experimental
```

## Quick start

```bash
# 1. Build the normalized DB from existing per-city JSON
npm run build:normalized

# 2. Generate slim public DB + per-city files for the frontend
npm run build:public

# 3. Or both at once
npm run build

# Frontend
cd frontend && npm install && npm run dev
```

## Data model (normalized)

Each `Deal` row captures a unique offer once:

| Field | Description |
|---|---|
| `deal_id` | `<chain>__<deal_type>` — stable |
| `confidence_score` | 0..1 |
| `verification_method` | `baseline` / `content` / `meta` / `http` / `reddit` / `slickdeals` / `newsletter` / `user-reported` |
| `last_verified_at` | ISO timestamp — drives the "checked Xd ago" badge |
| `first_seen_at` | preserved across runs |
| `recurrence` | `once` / `weekly` / `annual` / `ongoing` |
| `valid_from` / `valid_until` | for time-bounded offers (LTOs) |
| `source_type` | where the deal originated |

The frontend reads these to render confidence + freshness badges and to surface
`expires <date>` when applicable.

## Trust signals shown to users

- `✓ Verified` — confidence ≥ 0.9
- `~ Likely` — confidence ≥ 0.7
- `? Unverified` — below 0.7
- `checked 3d ago` — relative freshness from `last_verified_at`
- `expires Dec 15` — when `valid_until` is set

## Adding a new chain

1. Add to `data/chains.json` with OSM name variants and reward URL
2. Add baseline entries to `scraper/baseline/known-deals.json`
3. `npm run build` regenerates everything

## Adding a new city

1. Add to `data/cities.json` with center lat/lng + bounding box
2. Run `node scraper/sources/osm-locations.js [city-slug]` to fetch locations
3. `npm run build`

## Daily pipeline (CI)

```
verify-deals.js                    # HTTP + content check, self-healing
  → coupon-aggregator.js           # Reddit / Slickdeals / RetailMeNot
  → inject-missing-deals.js        # Fill from baseline
  → truncate-for-public.js         # Per-city diversity-aware truncation
  → apply-tags.js                  # Food categorization
  → apply-claim-data.js            # Claim flow metadata
  → build-normalized.js            # ⭐ rebuild source-of-truth DB
  → build-public.js                # ⭐ slim public DB + per-city files
  → generate-status-report.js      # Daily markdown report
  → alert-broken-chains.js         # GitHub Issues for true 404s
```

## Public API

`GET /api/deals` returns the slim DB with optional filters.

```
/api/deals
/api/deals?chain=mcdonalds
/api/deals?deal_type=birthday
/api/deals?min_confidence=0.9
```

## SEO

Per-chain (`/chains/[slug]`) and per-(chain, city) (`/chains/[slug]/[city]`) pages each emit
schema.org `Offer` / `OfferCatalog` JSON-LD with `validFrom`, `validThrough`, `availability`,
and `eligibleCustomerType`. With ~38 chains × ~79 cities × 70% coverage, that's roughly
**2,000 long-tail SEO surfaces** generated from one ~6 MB DB.

## Tech stack

- **Backend:** Node.js 20, Playwright (JS-heavy sites), Cheerio (static), Axios
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind 4
- **Data:** Normalized JSON DB; OSM Overpass API for locations
- **CI/CD:** GitHub Actions (daily cron + weekly health check)
- **Hosting:** Vercel
- **Cost:** $0 (Actions free tier + Vercel hobby)

## Roadmap (post-MVP)

- Move generated data off `main` to a `data` orphan branch (kill force-push churn)
- Add brand-newsletter inbox parsing as a daily volatile source
- Per-chain CI matrix (38 parallel jobs) for isolated failures
- User-reported deal accuracy + confirmation loop
- Email reminders for birthday-month and saved chains
- DB → SQLite-on-R2 with sql.js client-side query
