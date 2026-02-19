// generate-synthetic-city-data.js — Generate synthetic deal data for new cities
// Uses city population to estimate store counts, with realistic coordinate scatter
// Run: node generate-synthetic-city-data.js

const fs = require('fs');
const path = require('path');

const cities = require('./data/cities.json');
const chains = require('./data/chains.json');
const OUTPUT_BASE = path.join(__dirname, 'data/output');

// New cities that need synthetic data
const NEW_CITY_SLUGS = [
  'buffalo-ny', 'rochester-ny', 'providence-ri', 'baton-rouge-la',
  'birmingham-al', 'little-rock-ar', 'columbia-sc', 'greenville-sc',
  'jackson-ms', 'mobile-al', 'huntsville-al', 'chattanooga-tn',
  'knoxville-tn', 'spokane-wa', 'boise-id', 'reno-nv',
  'colorado-springs-co', 'wichita-ks', 'tulsa-ok', 'mcallen-tx',
  'corpus-christi-tx', 'lubbock-tx', 'cape-coral-fl', 'sarasota-fl'
];

// Street name suffixes for realism
const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Pkwy', 'Ln', 'Way', 'Ct'];
const STREET_NAMES = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Jefferson',
  'Lincoln', 'Park', 'Lake', 'Hill', 'River', 'Valley', 'Market', 'Center',
  'College', 'University', 'Broadway', 'Commerce', 'Industrial', 'Business',
  'Highway', 'Interstate', 'Frontage', 'Loop', 'Bypass'
];

// Chain availability by region (which chains are common in which areas)
const CHAIN_AVAILABILITY = {
  'whataburger': ['tx', 'ok', 'fl', 'ga', 'al', 'ms', 'la', 'ar', 'sc', 'tn', 'nm', 'az'],
  'jack-in-the-box': ['ca', 'tx', 'wa', 'or', 'nv', 'az', 'nm', 'co', 'id'],
  'del-taco': ['ca', 'nv', 'az', 'co', 'or', 'wa', 'id', 'tx', 'nm'],
  'shake-shack': ['ny', 'nj', 'ct', 'ri', 'ma', 'pa', 'dc', 'md', 'va', 'fl', 'ga', 'tx', 'ca', 'il', 'wa', 'co'],
  'waffle-house': ['ga', 'al', 'sc', 'nc', 'tn', 'fl', 'ms', 'la', 'ar', 'va', 'ky', 'oh', 'tx', 'ok'],
  'sonic': ['tx', 'ok', 'ks', 'mo', 'ar', 'la', 'ms', 'al', 'ga', 'fl', 'tn', 'ky', 'oh', 'in', 'ne', 'co', 'nm', 'az'],
  'wingstop': ['tx', 'ca', 'fl', 'ga', 'il', 'ny', 'la', 'al', 'ms', 'tn', 'sc', 'nc', 'md', 'va', 'pa', 'nv', 'az'],
};

// Store count estimate by population (per chain)
function estimateStoreCount(population, chain) {
  // Base: 1 store per 50,000 people, min 1, max 30
  const baseCount = Math.max(1, Math.min(30, Math.round(population / 50000)));
  // Adjust by chain type (fast food = more stores, sit-down = fewer)
  const sitDownChains = ['olive-garden', 'red-lobster', 'applebees', 'chilis', 'ihop', 'dennys', 'waffle-house'];
  const rareChains = ['shake-shack', 'cold-stone-creamery'];
  if (rareChains.includes(chain.slug)) return Math.max(1, Math.round(baseCount * 0.3));
  if (sitDownChains.includes(chain.slug)) return Math.max(1, Math.round(baseCount * 0.5));
  return baseCount;
}

// Check if chain is available in city's state
function isChainAvailable(chain, citySlug) {
  const state = citySlug.split('-').pop(); // e.g. 'ny', 'tx'
  const restriction = CHAIN_AVAILABILITY[chain.slug];
  if (!restriction) return true; // Available everywhere
  return restriction.includes(state);
}

// Generate random coordinate within bbox
function randomCoord(min, max) {
  return min + Math.random() * (max - min);
}

// Generate a synthetic address
function generateAddress(num) {
  const streetNum = 100 + Math.floor(Math.random() * 9900);
  const name = STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];
  const type = STREET_TYPES[Math.floor(Math.random() * STREET_TYPES.length)];
  return `${streetNum} ${name} ${type}`;
}

function generateLocationsForCity(city) {
  const locations = [];
  let osmIdCounter = 900000000 + Math.floor(Math.random() * 100000000);

  const stateAbbrev = city.slug.split('-').pop().toUpperCase();
  const { min_lat, max_lat, min_lng, max_lng } = city.bbox;

  for (const chain of chains) {
    if (!isChainAvailable(chain, city.slug)) continue;

    const storeCount = estimateStoreCount(city.population || 500000, chain);

    for (let i = 0; i < storeCount; i++) {
      const lat = randomCoord(min_lat, max_lat);
      const lng = randomCoord(min_lng, max_lng);

      locations.push({
        osm_id: osmIdCounter++,
        chain_slug: chain.slug,
        name: chain.osm_name_variants[0], // Primary name
        city_slug: city.slug,
        lat,
        lng,
        address: generateAddress(i),
        city: city.name.split(',')[0],
        state: stateAbbrev,
        zip: null,
        phone: null,
        opening_hours: null,
        synthetic: true, // Flag as synthetic
      });
    }
  }

  return locations;
}

function buildDealsFromLocations(citySlug, locations) {
  const chainsDir = path.join(OUTPUT_BASE, 'chains');

  // Group locations by chain
  const byChain = {};
  for (const loc of locations) {
    if (!byChain[loc.chain_slug]) byChain[loc.chain_slug] = [];
    byChain[loc.chain_slug].push(loc);
  }

  const cityDeals = [];
  for (const chainSlug of Object.keys(byChain)) {
    const chainFile = path.join(chainsDir, `${chainSlug}.json`);
    if (!fs.existsSync(chainFile)) continue;

    const chainData = JSON.parse(fs.readFileSync(chainFile));
    for (const deal of chainData.deals) {
      for (const location of byChain[chainSlug]) {
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

  return cityDeals;
}

async function main() {
  const newCities = cities.filter(c => NEW_CITY_SLUGS.includes(c.slug));
  console.log(`Generating synthetic data for ${newCities.length} cities...`);

  fs.mkdirSync(path.join(OUTPUT_BASE, 'locations'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_BASE, 'deals'), { recursive: true });

  for (const city of newCities) {
    // Skip if already has real location data
    const locPath = path.join(OUTPUT_BASE, 'locations', `${city.slug}.json`);
    if (fs.existsSync(locPath)) {
      const existing = JSON.parse(fs.readFileSync(locPath));
      if (!existing.synthetic) {
        console.log(`Skipping ${city.slug} (already has real data)`);
        continue;
      }
    }

    console.log(`Processing ${city.display}...`);
    const locations = generateLocationsForCity(city);

    // Save locations
    fs.writeFileSync(locPath, JSON.stringify({
      city_slug: city.slug,
      location_count: locations.length,
      updated_at: new Date().toISOString(),
      synthetic: true,
      locations
    }, null, 2));

    // Build deals
    const deals = buildDealsFromLocations(city.slug, locations);
    const dealPath = path.join(OUTPUT_BASE, 'deals', `${city.slug}.json`);
    fs.writeFileSync(dealPath, JSON.stringify({
      city_slug: city.slug,
      deal_count: deals.length,
      updated_at: new Date().toISOString(),
      synthetic: true,
      deals
    }, null, 2));

    console.log(`  ✅ ${city.slug}: ${locations.length} locations, ${deals.length} deals`);
  }

  console.log('\n✅ Done! Run node truncate-for-public.js to update public files.');
}

main().catch(err => { console.error(err); process.exit(1); });
