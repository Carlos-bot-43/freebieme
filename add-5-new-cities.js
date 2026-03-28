// add-5-new-cities.js — Add 5 new cities to FreebieMe
// Cities: Bakersfield CA, Riverside CA, Stockton CA, Akron OH, Aurora CO
// Run: node add-5-new-cities.js

const fs = require('fs');
const path = require('path');

const OUTPUT_BASE = path.join(__dirname, 'data/output');
const CITIES_FILE = path.join(__dirname, 'data/cities.json');

// 5 new cities with bbox, center, population
const NEW_CITIES = [
  {
    slug: 'bakersfield-ca',
    name: 'Bakersfield, CA',
    display: 'Bakersfield Metro, CA',
    center: { lat: 35.3733, lng: -119.0187 },
    bbox: { min_lat: 35.2, max_lat: 35.55, min_lng: -119.25, max_lng: -118.8 },
    population: 900000,
    priority: 3,
  },
  {
    slug: 'riverside-ca',
    name: 'Riverside, CA',
    display: 'Riverside Metro, CA',
    center: { lat: 33.9806, lng: -117.3755 },
    bbox: { min_lat: 33.8, max_lat: 34.15, min_lng: -117.6, max_lng: -117.1 },
    population: 1500000,
    priority: 3,
  },
  {
    slug: 'stockton-ca',
    name: 'Stockton, CA',
    display: 'Stockton Metro, CA',
    center: { lat: 37.9577, lng: -121.2908 },
    bbox: { min_lat: 37.8, max_lat: 38.12, min_lng: -121.5, max_lng: -121.05 },
    population: 750000,
    priority: 3,
  },
  {
    slug: 'akron-oh',
    name: 'Akron, OH',
    display: 'Akron Metro, OH',
    center: { lat: 41.0814, lng: -81.5190 },
    bbox: { min_lat: 40.95, max_lat: 41.22, min_lng: -81.7, max_lng: -81.3 },
    population: 700000,
    priority: 3,
  },
  {
    slug: 'aurora-co',
    name: 'Aurora, CO',
    display: 'Aurora Metro, CO',
    center: { lat: 39.7294, lng: -104.8319 },
    bbox: { min_lat: 39.6, max_lat: 39.85, min_lng: -104.98, max_lng: -104.65 },
    population: 650000,
    priority: 3,
  },
];

// Chain availability restrictions (same as generate-synthetic-city-data.js)
const CHAIN_AVAILABILITY = {
  'whataburger': ['tx', 'ok', 'fl', 'ga', 'al', 'ms', 'la', 'ar', 'sc', 'tn', 'nm', 'az'],
  'jack-in-the-box': ['ca', 'tx', 'wa', 'or', 'nv', 'az', 'nm', 'co', 'id'],
  'del-taco': ['ca', 'nv', 'az', 'co', 'or', 'wa', 'id', 'tx', 'nm'],
  'shake-shack': ['ny', 'nj', 'ct', 'ri', 'ma', 'pa', 'dc', 'md', 'va', 'fl', 'ga', 'tx', 'ca', 'il', 'wa', 'co'],
  'waffle-house': ['ga', 'al', 'sc', 'nc', 'tn', 'fl', 'ms', 'la', 'ar', 'va', 'ky', 'oh', 'tx', 'ok'],
  'sonic': ['tx', 'ok', 'ks', 'mo', 'ar', 'la', 'ms', 'al', 'ga', 'fl', 'tn', 'ky', 'oh', 'in', 'ne', 'co', 'nm', 'az'],
  'wingstop': ['tx', 'ca', 'fl', 'ga', 'il', 'ny', 'la', 'al', 'ms', 'tn', 'sc', 'nc', 'md', 'va', 'pa', 'nv', 'az'],
  'tim-hortons': ['ny', 'oh', 'mi', 'pa', 'ma', 'ct', 'nj', 'ky', 'tn', 'fl', 'ga', 'il', 'in', 'mn', 'mo', 'nc', 'va', 'md', 'tx', 'co', 'wa'],
};

// Store density by chain type
const CHAIN_DENSITY = {
  'shake-shack': 0.2,
  'cold-stone-creamery': 0.3,
  'krispy-kreme': 0.3,
  'tim-hortons': 0.3,
  'five-guys': 0.3,
  'olive-garden': 0.4,
  'red-lobster': 0.4,
  'applebees': 0.5,
  'chilis': 0.5,
  'ihop': 0.5,
  'dennys': 0.5,
  'waffle-house': 0.5,
  'buffalo-wild-wings': 0.6,
  'firehouse-subs': 0.5,
  'little-caesars': 1.2,
};

function isChainAvailable(chainSlug, citySlug) {
  const state = citySlug.split('-').pop();
  const restriction = CHAIN_AVAILABILITY[chainSlug];
  if (!restriction) return true;
  return restriction.includes(state);
}

function estimateStoreCount(population, chainSlug) {
  const density = CHAIN_DENSITY[chainSlug] || 1.0;
  return Math.max(1, Math.min(25, Math.round((population / 50000) * density)));
}

function seededRand(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Pkwy', 'Ln', 'Way'];
const STREET_NAMES = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Jefferson',
  'Lincoln', 'Park', 'Lake', 'Hill', 'River', 'Valley', 'Market', 'Center',
  'College', 'University', 'Broadway', 'Commerce', 'Industrial', 'Highway'
];

function randomCoord(rand, min, max) {
  return min + rand() * (max - min);
}

function generateAddress(rand) {
  const n = 100 + Math.floor(rand() * 9900);
  const name = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
  const type = STREET_TYPES[Math.floor(rand() * STREET_TYPES.length)];
  return `${n} ${name} ${type}`;
}

function generateCityData(city, allChains) {
  const { min_lat, max_lat, min_lng, max_lng } = city.bbox;
  const stateAbbrev = city.slug.split('-').pop().toUpperCase();
  const cityName = city.name.split(',')[0];

  const seed = city.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 7919;
  const rand = seededRand(seed);

  const locations = [];
  const deals = [];

  let osmIdBase = 800000000 + (city.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 10000);
  let idCounter = osmIdBase;

  const chainsDir = path.join(OUTPUT_BASE, 'chains');

  for (const chain of allChains) {
    if (!isChainAvailable(chain.slug, city.slug)) continue;

    const chainFile = path.join(chainsDir, `${chain.slug}.json`);
    if (!fs.existsSync(chainFile)) continue;

    const chainData = JSON.parse(fs.readFileSync(chainFile));
    const chainDeals = chainData.deals || [];
    if (chainDeals.length === 0) continue;

    const storeCount = estimateStoreCount(city.population, chain.slug);

    for (let i = 0; i < storeCount; i++) {
      const osmId = idCounter++;
      const lat = Math.round(randomCoord(rand, min_lat, max_lat) * 10000000) / 10000000;
      const lng = Math.round(randomCoord(rand, min_lng, max_lng) * 10000000) / 10000000;
      const address = generateAddress(rand);
      const primaryName = chain.osm_name_variants[0];

      locations.push({
        osm_id: osmId,
        chain_slug: chain.slug,
        name: primaryName,
        city_slug: city.slug,
        lat,
        lng,
        address,
        city: cityName,
        state: stateAbbrev,
        zip: null,
        phone: null,
        opening_hours: null,
        synthetic: true,
      });

      for (const deal of chainDeals) {
        deals.push({
          deal_id: `${chain.slug}_${deal.deal_type}_${osmId}`,
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
          chain_slug: chain.slug,
          location_name: primaryName,
          address,
          city: cityName,
          state: stateAbbrev,
          zip: null,
          lat,
          lng,
          phone: null,
          opening_hours: null,
        });
      }
    }
  }

  return { locations, deals };
}

function main() {
  // Load all chains
  const allChains = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/chains.json')));

  // Load and update cities.json
  const existingCities = JSON.parse(fs.readFileSync(CITIES_FILE));
  const existingSlugs = new Set(existingCities.map(c => c.slug));

  let citiesAdded = 0;
  for (const city of NEW_CITIES) {
    if (existingSlugs.has(city.slug)) {
      console.log(`${city.slug} already in cities.json, skipping`);
      continue;
    }

    console.log(`\nGenerating data for ${city.display}...`);
    const { locations, deals } = generateCityData(city, allChains);

    // Write location file
    const locPath = path.join(OUTPUT_BASE, 'locations', `${city.slug}.json`);
    fs.writeFileSync(locPath, JSON.stringify({
      city_slug: city.slug,
      location_count: locations.length,
      updated_at: new Date().toISOString(),
      locations,
    }, null, 2));

    // Write deal file
    const dealPath = path.join(OUTPUT_BASE, 'deals', `${city.slug}.json`);
    fs.writeFileSync(dealPath, JSON.stringify({
      city_slug: city.slug,
      deal_count: deals.length,
      updated_at: new Date().toISOString(),
      deals,
    }, null, 2));

    console.log(`  ✅ ${city.slug}: ${locations.length} locations, ${deals.length} deals`);
    citiesAdded++;
  }

  // Update cities.json with new cities
  const newCitiesToAdd = NEW_CITIES.filter(c => !existingSlugs.has(c.slug));
  if (newCitiesToAdd.length > 0) {
    const updated = [...existingCities, ...newCitiesToAdd];
    fs.writeFileSync(CITIES_FILE, JSON.stringify(updated, null, 2));
    console.log(`\n✅ Updated cities.json: ${updated.length} total cities`);
  }

  console.log(`\n✅ Done! Added ${citiesAdded} new cities`);
}

main();
