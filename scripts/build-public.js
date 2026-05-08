#!/usr/bin/env node
// Generate the legacy per-city JSON files from the normalized DB.
//
// Reads:   data/normalized/db.json
// Writes:  frontend/public/data/deals/*.json   (one per city; legacy shape preserved)
//          data/last-good-run.json
//
// The legacy shape lets the existing frontend keep rendering unchanged. Adds the new
// freshness/confidence fields as optional extras — DealCard picks them up if present.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'data/normalized/db.json');
const CITIES_JSON = path.join(ROOT, 'data/cities.json');
const OUTPUT_DIR = path.join(ROOT, 'frontend/public/data/deals');
const PUBLIC_DATA_DIR = path.join(ROOT, 'frontend/public/data');
const PUBLIC_DB_PATH = path.join(PUBLIC_DATA_DIR, 'db.json');
const PUBLIC_INDEX_PATH = path.join(PUBLIC_DATA_DIR, 'index.json');
const LAST_GOOD_RUN = path.join(ROOT, 'data/last-good-run.json');

const PER_CITY_LIMIT = 1000;

function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return fallback; }
}

function deriveCityNameFromSlug(slug) {
  // austin-tx → "Austin, TX"
  const parts = slug.split('-');
  const state = parts.pop()?.toUpperCase() || '';
  const name = parts.map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
  return `${name}, ${state}`;
}

function main() {
  const db = readJSON(DB_PATH);
  if (!db) {
    console.error(`No normalized DB at ${DB_PATH}. Run scripts/build-normalized.js first.`);
    process.exit(1);
  }

  const cities = readJSON(CITIES_JSON, []);
  const cityBySlug = new Map(cities.map(c => [c.slug, c]));

  const dealById = new Map(db.deals.map(d => [d.deal_id, d]));
  const chainBySlug = new Map(db.chains.map(c => [c.slug, c]));

  // Index locations by city.
  const locationsByCity = new Map();
  for (const loc of db.locations) {
    if (!locationsByCity.has(loc.city_slug)) locationsByCity.set(loc.city_slug, []);
    locationsByCity.get(loc.city_slug).push(loc);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const generatedAt = db.generated_at;
  let totalDealsWritten = 0;
  const chainsWithDeals = new Set();
  const cityCounts = {};

  for (const [citySlug, locations] of locationsByCity.entries()) {
    const cityConf = cityBySlug.get(citySlug);
    const cityDisplay = cityConf?.display || cityConf?.name || deriveCityNameFromSlug(citySlug);

    // For this city: every deal × every matching location for that chain.
    const cityDeals = [];
    const locsByChain = new Map();
    for (const loc of locations) {
      if (!locsByChain.has(loc.chain_slug)) locsByChain.set(loc.chain_slug, []);
      locsByChain.get(loc.chain_slug).push(loc);
    }

    for (const deal of db.deals) {
      const chain = chainBySlug.get(deal.chain_slug);
      if (!chain) continue;
      const locs = locsByChain.get(deal.chain_slug) || [];
      if (locs.length === 0) continue;

      for (const loc of locs) {
        cityDeals.push({
          // Legacy shape (unchanged) ----------------------------------------
          deal_id: `${deal.deal_id}__${loc.location_id}`,
          title: deal.title,
          description: deal.description,
          deal_type: deal.deal_type,
          free_item: deal.free_item,
          discount_percent: deal.discount_percent,
          discount_amount: deal.discount_amount,
          requires_app: deal.requires_app,
          requires_signup: deal.requires_signup,
          requires_purchase: deal.requires_purchase,
          coupon_code: deal.coupon_code,
          confidence_score: deal.confidence_score,
          source_url: deal.source_url,
          is_recurring: deal.recurrence !== 'once',
          chain_slug: deal.chain_slug,
          location_name: chain.name,
          address: loc.address,
          city: cityDisplay,
          state: null,
          zip: null,
          lat: loc.lat,
          lng: loc.lng,
          phone: loc.phone,
          food_tags: deal.food_tags,
          claim_type: deal.claim_type,
          claim_steps: deal.claim_steps,
          value_summary: deal.value_summary,
          ...(deal.happy_hour_start ? {
            happy_hour_start: deal.happy_hour_start,
            happy_hour_end: deal.happy_hour_end,
            happy_hour_days: deal.happy_hour_days,
            happy_hour_note: deal.happy_hour_note,
          } : {}),
          // New optional fields — DealCard reads these when present --------
          last_verified_at: deal.last_verified_at,
          first_seen_at: deal.first_seen_at,
          verification_method: deal.verification_method,
          recurrence: deal.recurrence,
          valid_until: deal.valid_until,
          source_type: deal.source_type,
        });
      }
    }

    // Match the existing diversity-aware truncation (chain × deal_type round-robin).
    const truncated = truncate(cityDeals, PER_CITY_LIMIT);
    truncated.forEach(d => chainsWithDeals.add(d.chain_slug));
    totalDealsWritten += truncated.length;
    cityCounts[citySlug] = truncated.length;

    const out = {
      city_slug: citySlug,
      deal_count: truncated.length,
      updated_at: generatedAt,
      truncated_to: PER_CITY_LIMIT,
      deals: truncated,
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, `${citySlug}.json`), JSON.stringify(out));
  }

  fs.writeFileSync(LAST_GOOD_RUN, JSON.stringify({
    run_at: generatedAt,
    total_deals: totalDealsWritten,
    cities: locationsByCity.size,
    chains_with_deals: chainsWithDeals.size,
    unique_offers: db.deals.length,
  }, null, 2));

  // --- Slim public DB: chains + deals only (no locations) — what the new SEO/API routes read.
  // Locations stay in per-city files; chain pages don't need the full 20k-row location table.
  const slimDb = {
    schema_version: db.schema_version,
    generated_at: db.generated_at,
    chains: db.chains,
    deals: db.deals,
    location_counts_by_chain: countLocationsByChain(db.locations),
    location_counts_by_chain_city: countLocationsByChainCity(db.locations),
  };
  fs.writeFileSync(PUBLIC_DB_PATH, JSON.stringify(slimDb));

  // --- Tiny index for client-side metadata lookups (homepage stats, etc).
  fs.writeFileSync(PUBLIC_INDEX_PATH, JSON.stringify({
    generated_at: generatedAt,
    chain_count: db.chains.length,
    deal_count: db.deals.length,
    location_count: db.locations.length,
    city_counts: cityCounts,
  }));

  const slimMb = (fs.statSync(PUBLIC_DB_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${locationsByCity.size} city files | ${totalDealsWritten} legacy rows | ${chainsWithDeals.size} chains | ${db.deals.length} unique offers`);
  console.log(`Slim public DB: ${slimMb} MB at ${PUBLIC_DB_PATH}`);
}

function countLocationsByChain(locations) {
  const out = {};
  for (const l of locations) out[l.chain_slug] = (out[l.chain_slug] || 0) + 1;
  return out;
}

function countLocationsByChainCity(locations) {
  const out = {};
  for (const l of locations) {
    const key = `${l.chain_slug}__${l.city_slug}`;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function truncate(deals, limit) {
  if (deals.length <= limit) return deals;

  const DEAL_TYPE_PRIORITY = {
    birthday: 0, signup_bonus: 1, freebie: 2,
    app_deal: 3, bogo: 4, happy_hour: 5,
    discount: 6, rewards_program: 7, other: 8,
  };
  const score = d => (DEAL_TYPE_PRIORITY[d.deal_type] ?? 9) * 100 + (1 - (d.confidence_score ?? 0)) * 10;

  // Group by chain × deal_type, sort each group by score, then round-robin to fill the cap.
  const byGroup = new Map();
  for (const d of deals) {
    const key = `${d.chain_slug}__${d.deal_type}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(d);
  }
  for (const arr of byGroup.values()) arr.sort((a, b) => score(a) - score(b));

  const groups = Array.from(byGroup.keys());
  const allocation = Object.fromEntries(groups.map(k => [k, 0]));
  let remaining = limit;
  let changed = true;
  while (remaining > 0 && changed) {
    changed = false;
    const eligible = groups
      .filter(k => allocation[k] < byGroup.get(k).length)
      .sort((a, b) => score(byGroup.get(a)[allocation[a]]) - score(byGroup.get(b)[allocation[b]]));
    for (const k of eligible) {
      if (remaining <= 0) break;
      allocation[k]++;
      remaining--;
      changed = true;
    }
  }
  const out = [];
  for (const k of groups) out.push(...byGroup.get(k).slice(0, allocation[k]));
  out.sort((a, b) => score(a) - score(b));
  return out;
}

main();
