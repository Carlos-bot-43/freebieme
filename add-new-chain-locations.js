// add-new-chain-locations.js — Fetch OSM locations for NEW chains in EXISTING cities
// Run: node add-new-chain-locations.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Only the new chains added in Release 5
const NEW_CHAIN_SLUGS = [
  'whataburger', 'jack-in-the-box', 'del-taco', 'shake-shack', 'waffle-house',
  'ihop', 'dennys', 'applebees', 'chilis', 'olive-garden', 'red-lobster',
  'baskin-robbins', 'cold-stone-creamery', 'dairy-queen'
];

const chains = require('./data/chains.json').filter(c => NEW_CHAIN_SLUGS.includes(c.slug));
const allCities = require('./data/cities.json');
const OUTPUT_BASE = path.join(__dirname, 'data/output');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildQuery(city, variants) {
  const { min_lat, max_lat, min_lng, max_lng } = city.bbox;
  const bbox = `${min_lat},${min_lng},${max_lat},${max_lng}`;
  const nodeFilters = variants.map(n => `node["name"="${n}"](${bbox});`).join('\n  ');
  const wayFilters = variants.map(n => `way["name"="${n}"](${bbox});`).join('\n  ');
  return `[out:json][timeout:35];\n(\n  ${nodeFilters}\n  ${wayFilters}\n);\nout center;`;
}

function matchChainSlug(osmName) {
  if (!osmName) return null;
  for (const chain of chains) {
    const normalized = osmName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const variant of chain.osm_name_variants) {
      if (normalized === variant.toLowerCase().replace(/[^a-z0-9]/g, '')) {
        return chain.slug;
      }
    }
  }
  return null;
}

async function fetchNewChainLocations(city) {
  const allVariants = chains.flatMap(c => c.osm_name_variants);
  // Split into batches of 5
  const batches = [];
  for (let i = 0; i < allVariants.length; i += 5) {
    batches.push(allVariants.slice(i, i + 5));
  }

  const allElements = [];
  for (const batch of batches) {
    try {
      const query = buildQuery(city, batch);
      const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 40000
      });
      allElements.push(...(res.data.elements || []));
      await sleep(500);
    } catch (err) {
      // Continue
    }
  }

  return allElements
    .filter(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      return lat && lon && el.tags?.name;
    })
    .map(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      const chainSlug = matchChainSlug(el.tags.name);
      if (!chainSlug) return null;
      return {
        osm_id: el.id,
        chain_slug: chainSlug,
        name: el.tags.name,
        city_slug: city.slug,
        lat, lng: lon,
        address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' ') || null,
        city: el.tags['addr:city'] || city.name,
        state: el.tags['addr:state'] || null,
        zip: el.tags['addr:postcode'] || null,
        phone: el.tags.phone || el.tags['contact:phone'] || null,
        opening_hours: el.tags.opening_hours || null,
      };
    })
    .filter(Boolean);
}

function buildCityDealsFile(citySlug) {
  const chainsDir = path.join(OUTPUT_BASE, 'chains');
  const locationsPath = path.join(OUTPUT_BASE, 'locations', `${citySlug}.json`);
  if (!fs.existsSync(locationsPath)) return 0;

  const locationData = JSON.parse(fs.readFileSync(locationsPath));
  const locations = locationData.locations || [];

  const locationsByChain = {};
  for (const loc of locations) {
    if (!locationsByChain[loc.chain_slug]) locationsByChain[loc.chain_slug] = [];
    locationsByChain[loc.chain_slug].push(loc);
  }

  const cityDeals = [];
  for (const chainSlug of Object.keys(locationsByChain)) {
    const chainFile = path.join(chainsDir, `${chainSlug}.json`);
    if (!fs.existsSync(chainFile)) continue;
    const chainData = JSON.parse(fs.readFileSync(chainFile));
    for (const deal of chainData.deals) {
      for (const location of locationsByChain[chainSlug]) {
        cityDeals.push({
          deal_id: `${chainSlug}_${deal.deal_type}_${location.osm_id}`,
          title: deal.title,
          description: deal.description,
          deal_type: deal.deal_type,
          free_item: deal.free_item || null,
          discount_percent: deal.discount_percent || null,
          discount_amount: deal.discount_amount || null,
          requires_app: deal.requires_app,
          requires_signup: deal.requires_signup,
          requires_purchase: deal.requires_purchase || false,
          coupon_code: deal.coupon_code || null,
          confidence_score: deal.confidence_score,
          source_url: deal.source_url,
          is_recurring: deal.is_recurring,
          chain_slug: chainSlug,
          location_name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip,
          lat: location.lat,
          lng: location.lng,
          phone: location.phone,
          opening_hours: location.opening_hours,
        });
      }
    }
  }

  const outPath = path.join(OUTPUT_BASE, 'deals', `${citySlug}.json`);
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath)) : { deals: [] };
  existing.deals = cityDeals;
  existing.deal_count = cityDeals.length;
  existing.updated_at = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  return cityDeals.length;
}

async function main() {
  console.log(`Fetching locations for ${chains.length} new chains across all cities...`);

  for (const city of allCities) {
    console.log(`\n${city.display}...`);
    const locPath = path.join(OUTPUT_BASE, 'locations', `${city.slug}.json`);
    if (!fs.existsSync(locPath)) {
      console.log('  No location file yet, skipping');
      continue;
    }

    try {
      const newLocations = await fetchNewChainLocations(city);
      if (newLocations.length === 0) {
        console.log('  No new chain locations found');
        continue;
      }

      // Merge with existing location data
      const existing = JSON.parse(fs.readFileSync(locPath));
      const existingIds = new Set(existing.locations.map(l => l.osm_id));
      const merged = [
        ...existing.locations,
        ...newLocations.filter(l => !existingIds.has(l.osm_id))
      ];
      existing.locations = merged;
      existing.location_count = merged.length;
      existing.updated_at = new Date().toISOString();
      fs.writeFileSync(locPath, JSON.stringify(existing, null, 2));
      console.log(`  Added ${newLocations.length} new chain locations (total: ${merged.length})`);

      // Rebuild deal file
      const dealCount = buildCityDealsFile(city.slug);
      console.log(`  Rebuilt deals: ${dealCount} total`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    await sleep(2000);
  }

  console.log('\n✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
