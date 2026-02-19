# FreebieMe 🍔

Free food deal aggregator — birthday freebies, app deals, sign-up bonuses & restaurant rewards, all in one place.

## What It Does

- Scrapes 20 major restaurant chain reward pages daily
- Fetches location data for 25 US metro areas via OpenStreetMap (free, no API key)
- Combines deals × locations into per-city JSON files
- Serves a fast, static Next.js frontend with location detection and deal filtering

## Project Structure

```
freebieme/
├── scraper/               # Node.js scraper
│   ├── sources/           # Data sources (chain sites, OSM, coupon sites)
│   ├── parsers/           # Deal text parser + confidence scorer
│   ├── baseline/          # Hardcoded known-good deals (never scraped away)
│   └── utils/             # Export, logging utils
├── data/
│   ├── chains.json        # Master chain config (20 chains)
│   ├── cities.json        # 25 US metro areas with bounding boxes
│   └── output/
│       ├── deals/         # Per-city deal files (what frontend reads)
│       ├── chains/        # Per-chain deal files
│       └── locations/     # Per-city restaurant locations
├── frontend/              # Next.js app (TypeScript + Tailwind)
│   ├── app/               # App Router pages
│   └── components/        # Reusable UI components
└── .github/workflows/     # GitHub Actions (daily scraper cron)
```

## Quick Start

### Run the Scraper

```bash
# Dry run (test all modules load)
npm test

# Scrape all chains
npm run scrape:chains

# Fetch OSM locations (single city)
node scraper/sources/osm-locations.js richmond-va

# Fetch OSM locations (all 25 cities)
npm run scrape:locations

# Full scrape (chains + locations + city files)
npm run scrape
```

### Run the Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

### Build for Production

```bash
cd frontend
npm run build
```

## Data Pipeline

```
Chain reward pages → chain-rewards.js → data/output/chains/[slug].json
OSM Overpass API  → osm-locations.js  → data/output/locations/[city].json
Both              → export.js          → data/output/deals/[city].json
                                              ↑
                                         Frontend reads this
```

## Adding a New Chain

1. Add to `data/chains.json` with OSM name variants and reward URL
2. Add baseline deals to `scraper/baseline/known-deals.json`
3. Run `npm run scrape:chains`

## Adding a New City

1. Add to `data/cities.json` with center lat/lng and bounding box
2. Run `node scraper/sources/osm-locations.js [city-slug]`
3. Rebuild city deal file: `node -e "require('./scraper/utils/export').buildCityDealsFile('[city-slug]')"`

## Deployment

- **Scraper:** GitHub Actions (daily at 4 AM ET)
- **Frontend:** Vercel (connect repo, set root directory to `frontend/`)
- **Cost:** $0 (GitHub Actions free tier + Vercel hobby plan)

## Data Sources

- Chain reward pages: Official restaurant websites
- Location data: OpenStreetMap via Overpass API (free, no rate limits)
- Baseline deals: Hand-curated, verified deals as fallback

## Tech Stack

- **Scraper:** Node.js, Playwright (JS-heavy sites), Cheerio (static HTML), Axios
- **Location:** OpenStreetMap Overpass API
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **CI/CD:** GitHub Actions
- **Hosting:** Vercel
