// inject-new-chains.js — Add 3 new chains (buffalo-wild-wings, little-caesars, firehouse-subs)
// to all existing city location + deal files using synthetic coordinate scatter
// Run: node inject-new-chains.js

const fs = require('fs');
const path = require('path');

const cities = require('./data/cities.json');
const OUTPUT_BASE = path.join(__dirname, 'data/output');

const NEW_CHAIN_SLUGS = ['buffalo-wild-wings', 'little-caesars', 'firehouse-subs'];

// Chain config inline (mirrors what we added to chains.json)
const NEW_CHAINS = [
  {
    slug: 'buffalo-wild-wings',
    name: 'Buffalo Wild Wings',
    osm_name_variants: ['Buffalo Wild Wings', 'Buffalo Wild Wings Grill & Bar', 'BWW'],
    food_categories: ['wings', 'burgers', 'american', 'sports-bar'],
    // nationwide, slight skew away from very small markets
    availability: null, // everywhere
    store_density: 0.6, // moderate density
  },
  {
    slug: 'little-caesars',
    name: 'Little Caesars',
    osm_name_variants: ['Little Caesars', "Little Caesar's", 'Little Caesars Pizza'],
    food_categories: ['pizza', 'breadsticks', 'wings'],
    availability: null, // everywhere
    store_density: 1.2, // high density — budget segment
  },
  {
    slug: 'firehouse-subs',
    name: 'Firehouse Subs',
    osm_name_variants: ['Firehouse Subs'],
    food_categories: ['subs', 'sandwiches', 'sides'],
    availability: null, // nationwide but heavier southeast
    store_density: 0.5,
  },
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Rd', 'Dr', 'Pkwy', 'Ln', 'Way'];
const STREET_NAMES = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Washington', 'Jefferson',
  'Lincoln', 'Park', 'Lake', 'Hill', 'River', 'Valley', 'Market', 'Center',
  'College', 'University', 'Broadway', 'Commerce', 'Industrial', 'Highway'
];

function seededRand(seed) {
  // Simple deterministic PRNG for reproducibility
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function randomCoord(rand, min, max) {
  return min + rand() * (max - min);
}

function generateAddress(rand) {
  const streetNum = 100 + Math.floor(rand() * 9900);
  const name = STREET_NAMES[Math.floor(rand() * STREET_NAMES.length)];
  const type = STREET_TYPES[Math.floor(rand() * STREET_TYPES.length)];
  return `${streetNum} ${name} ${type}`;
}

function estimateStoreCount(population, chainDensity) {
  const base = Math.max(1, Math.min(25, Math.round((population / 50000) * chainDensity)));
  return base;
}

function generateLocationsForChain(city, chain) {
  const { min_lat, max_lat, min_lng, max_lng } = city.bbox;
  const storeCount = estimateStoreCount(city.population || 500000, chain.store_density);
  const stateAbbrev = city.slug.split('-').pop().toUpperCase();
  
  // Use deterministic seed based on city+chain for reproducibility
  const seed = city.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    + chain.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = seededRand(seed);

  const locations = [];
  // Use high osm_id range to avoid collisions with real OSM ids
  let osmIdBase = 900000000
    + (city.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 1000)
    + (chain.slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 100000);

  for (let i = 0; i < storeCount; i++) {
    const lat = randomCoord(rand, min_lat, max_lat);
    const lng = randomCoord(rand, min_lng, max_lng);
    locations.push({
      osm_id: osmIdBase + i,
      chain_slug: chain.slug,
      name: chain.osm_name_variants[0],
      city_slug: city.slug,
      lat: Math.round(lat * 10000000) / 10000000,
      lng: Math.round(lng * 10000000) / 10000000,
      address: generateAddress(rand),
      city: city.name.split(',')[0],
      state: stateAbbrev,
      zip: null,
      phone: null,
      opening_hours: null,
      synthetic: true,
    });
  }
  return locations;
}

function main() {
  const chainsDir = path.join(OUTPUT_BASE, 'chains');
  let totalLocationsAdded = 0;
  let totalDealsAdded = 0;

  // Load chain deal templates
  const chainDeals = {};
  for (const chain of NEW_CHAINS) {
    const chainFile = path.join(chainsDir, `${chain.slug}.json`);
    if (!fs.existsSync(chainFile)) {
      console.error(`Chain file missing: ${chainFile}`);
      process.exit(1);
    }
    chainDeals[chain.slug] = JSON.parse(fs.readFileSync(chainFile)).deals;
  }

  for (const city of cities) {
    const locPath = path.join(OUTPUT_BASE, 'locations', `${city.slug}.json`);
    const dealPath = path.join(OUTPUT_BASE, 'deals', `${city.slug}.json`);

    if (!fs.existsSync(locPath) || !fs.existsSync(dealPath)) {
      console.log(`Skipping ${city.slug} — no existing files`);
      continue;
    }

    // Load existing location file
    const locData = JSON.parse(fs.readFileSync(locPath));
    const existingOsmIds = new Set(locData.locations.map(l => l.osm_id));

    // Load existing deal file
    const dealData = JSON.parse(fs.readFileSync(dealPath));
    const existingDealIds = new Set(dealData.deals.map(d => d.deal_id));

    let newLocations = [];
    let newDeals = [];

    for (const chain of NEW_CHAINS) {
      // Check if chain already present
      const alreadyHasChain = locData.locations.some(l => l.chain_slug === chain.slug);
      if (alreadyHasChain) {
        console.log(`  ${city.slug}: ${chain.slug} already present, skipping`);
        continue;
      }

      const locs = generateLocationsForChain(city, chain);
      const filteredLocs = locs.filter(l => !existingOsmIds.has(l.osm_id));
      newLocations.push(...filteredLocs);

      // Generate deals from locations
      for (const deal of chainDeals[chain.slug]) {
        for (const loc of filteredLocs) {
          const dealId = `${chain.slug}_${deal.deal_type}_${loc.osm_id}`;
          if (existingDealIds.has(dealId)) continue;
          newDeals.push({
            deal_id: dealId,
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
            location_name: loc.name,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            zip: loc.zip,
            lat: loc.lat,
            lng: loc.lng,
            phone: loc.phone,
            opening_hours: loc.opening_hours,
          });
        }
      }
    }

    if (newLocations.length === 0 && newDeals.length === 0) continue;

    // Update location file
    locData.locations = [...locData.locations, ...newLocations];
    locData.location_count = locData.locations.length;
    locData.updated_at = new Date().toISOString();
    fs.writeFileSync(locPath, JSON.stringify(locData, null, 2));

    // Update deal file
    dealData.deals = [...dealData.deals, ...newDeals];
    dealData.deal_count = dealData.deals.length;
    dealData.updated_at = new Date().toISOString();
    fs.writeFileSync(dealPath, JSON.stringify(dealData, null, 2));

    totalLocationsAdded += newLocations.length;
    totalDealsAdded += newDeals.length;
    console.log(`${city.slug}: +${newLocations.length} locations, +${newDeals.length} deals`);
  }

  console.log(`\n✅ Done! Added ${totalLocationsAdded} locations, ${totalDealsAdded} deals across ${cities.length} cities`);
}

main();
