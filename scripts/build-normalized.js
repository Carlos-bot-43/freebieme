#!/usr/bin/env node
// Build the normalized DB from the existing per-city JSON files.
//
// Reads:   frontend/public/data/deals/*.json   (or data/output/deals/*.json if present)
//          data/chains.json
//          data/cities.json
//          scraper/baseline/known-deals.json     (for verification_method = 'baseline' detection)
//
// Writes:  data/normalized/db.json              (the canonical normalized DB)
//
// Idempotent: re-runs produce the same output (apart from generated_at timestamps).
// Preserves first_seen_at across runs by reading the previous db.json if it exists.

const fs = require('fs');
const path = require('path');
const { SCHEMA_VERSION, validateDeal } = require('../lib/schema');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DEALS = path.join(ROOT, 'frontend/public/data/deals');
const OUTPUT_DEALS = path.join(ROOT, 'data/output/deals');
const CHAINS_JSON = path.join(ROOT, 'data/chains.json');
const CITIES_JSON = path.join(ROOT, 'data/cities.json');
const BASELINE_JSON = path.join(ROOT, 'scraper/baseline/known-deals.json');
const OUTPUT_DIR = path.join(ROOT, 'data/normalized');
const OUTPUT_DB = path.join(OUTPUT_DIR, 'db.json');

function pickDealsDir() {
  if (fs.existsSync(OUTPUT_DEALS) && fs.readdirSync(OUTPUT_DEALS).length > 0) return OUTPUT_DEALS;
  return PUBLIC_DEALS;
}

function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return fallback; }
}

function classifySource(deal, baselineKeys) {
  const key = `${deal.chain_slug}__${deal.deal_type}`;
  if (baselineKeys.has(key)) return { source_type: 'baseline', verification_method: 'baseline' };
  if (deal.confidence_score >= 0.9) return { source_type: 'scraper', verification_method: 'content' };
  if (deal.confidence_score >= 0.7) return { source_type: 'scraper', verification_method: 'meta' };
  return { source_type: 'scraper', verification_method: 'http' };
}

function inferRecurrence(deal) {
  if (deal.deal_type === 'birthday') return 'annual';
  if (deal.deal_type === 'happy_hour') return 'weekly';
  if (deal.deal_type === 'signup_bonus') return 'once';
  if (deal.is_recurring === false) return 'once';
  return 'ongoing';
}

function main() {
  const dealsDir = pickDealsDir();
  console.log(`Reading deals from: ${dealsDir}`);

  const chains = readJSON(CHAINS_JSON, []);
  const cities = readJSON(CITIES_JSON, []);
  const baseline = readJSON(BASELINE_JSON, []);
  const baselineKeys = new Set(baseline.map(b => `${b.chain_slug}__${b.deal_type}`));

  // Preserve first_seen_at from previous run (so freshness badges don't reset).
  const prev = readJSON(OUTPUT_DB, { deals: [] });
  const prevFirstSeen = new Map();
  for (const d of (prev.deals || [])) {
    prevFirstSeen.set(d.deal_id, d.first_seen_at);
  }

  const dealsByKey = new Map();      // chain__deal_type → canonical deal
  const locationsByKey = new Map();  // chain__city__lat,lng → canonical location

  const cityFiles = fs.readdirSync(dealsDir).filter(f => f.endsWith('.json'));
  let rawDealCount = 0;

  for (const file of cityFiles) {
    const citySlug = file.replace(/\.json$/, '');
    const data = readJSON(path.join(dealsDir, file));
    if (!data || !Array.isArray(data.deals)) continue;
    rawDealCount += data.deals.length;

    for (const d of data.deals) {
      if (!d.chain_slug || !d.deal_type) continue;

      // --- Deal: keep best version (highest confidence, then most fields populated) ---
      const dealKey = `${d.chain_slug}__${d.deal_type}`;
      const existing = dealsByKey.get(dealKey);
      const isBetter = !existing || (d.confidence_score ?? 0) > (existing.confidence_score ?? 0);

      if (isBetter) {
        const { source_type, verification_method } = classifySource(d, baselineKeys);
        const now = new Date().toISOString();
        dealsByKey.set(dealKey, {
          deal_id: dealKey,
          chain_slug: d.chain_slug,
          deal_type: d.deal_type,
          title: d.title || '',
          description: d.description || '',
          free_item: d.free_item ?? null,
          discount_percent: d.discount_percent ?? null,
          discount_amount: d.discount_amount ?? null,
          coupon_code: d.coupon_code ?? null,
          requires_app: !!d.requires_app,
          requires_signup: !!d.requires_signup,
          requires_purchase: !!d.requires_purchase,
          source_url: d.source_url || '',
          source_type,
          recurrence: inferRecurrence(d),
          valid_from: null,
          valid_until: null,
          confidence_score: d.confidence_score ?? 0.5,
          verification_method,
          last_verified_at: now,
          first_seen_at: prevFirstSeen.get(dealKey) || now,
          claim_type: d.claim_type || 'same_day_setup',
          claim_steps: d.claim_steps || [],
          value_summary: d.value_summary || '',
          food_tags: d.food_tags || [],
          ...(d.happy_hour_start ? {
            happy_hour_start: d.happy_hour_start,
            happy_hour_end: d.happy_hour_end,
            happy_hour_days: d.happy_hour_days,
            happy_hour_note: d.happy_hour_note,
          } : {}),
        });
      }

      // --- Location: dedupe by (chain, city, lat, lng) ---
      if (typeof d.lat === 'number' && typeof d.lng === 'number') {
        const locKey = `${d.chain_slug}__${citySlug}__${d.lat.toFixed(5)},${d.lng.toFixed(5)}`;
        if (!locationsByKey.has(locKey)) {
          locationsByKey.set(locKey, {
            location_id: locKey,
            chain_slug: d.chain_slug,
            city_slug: citySlug,
            address: d.address ?? null,
            lat: d.lat,
            lng: d.lng,
            phone: d.phone ?? null,
            opening_hours: d.opening_hours ?? null,
          });
        }
      }
    }
  }

  const dealsArray = Array.from(dealsByKey.values()).sort((a, b) =>
    a.chain_slug.localeCompare(b.chain_slug) || a.deal_type.localeCompare(b.deal_type)
  );
  const locationsArray = Array.from(locationsByKey.values());

  // Validate every deal — fail loudly on schema violations.
  const errors = [];
  for (const d of dealsArray) {
    const errs = validateDeal(d);
    if (errs.length) errors.push(`${d.deal_id}: ${errs.join(', ')}`);
  }
  if (errors.length) {
    console.error('Schema validation failed:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const db = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    chains: chains.map(c => ({
      slug: c.slug,
      name: c.name,
      rewards_url: c.rewards_url,
      cuisine: c.cuisine || [],
      food_categories: c.food_categories || [],
    })),
    deals: dealsArray,
    locations: locationsArray,
    offers: [],
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_DB, JSON.stringify(db, null, 2));

  // Compact stats summary.
  const sizeMb = (fs.statSync(OUTPUT_DB).size / 1024 / 1024).toFixed(2);
  const expandedDeals = locationsArray.length * (dealsArray.length / Math.max(1, chains.length));
  console.log('');
  console.log('Normalized DB built:');
  console.log(`  schema_version:  ${SCHEMA_VERSION}`);
  console.log(`  chains:          ${db.chains.length}`);
  console.log(`  deals (unique):  ${dealsArray.length}   (was ${rawDealCount} flattened — ${(rawDealCount / Math.max(1, dealsArray.length)).toFixed(0)}× duplication)`);
  console.log(`  locations:       ${locationsArray.length}   across ${cityFiles.length} cities`);
  console.log(`  size on disk:    ${sizeMb} MB   ${OUTPUT_DB}`);
}

main();
