// export.js
// Exports data to JSON files (source of truth)

const fs = require('fs');
const path = require('path');

const OUTPUT_BASE = path.join(__dirname, '../../data/output');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Save chain-wide deals (not location-specific)
async function saveChainDeals(chainSlug, deals) {
  ensureDir(path.join(OUTPUT_BASE, 'chains'));
  const filePath = path.join(OUTPUT_BASE, 'chains', `${chainSlug}.json`);

  const output = {
    chain_slug: chainSlug,
    deal_count: deals.length,
    updated_at: new Date().toISOString(),
    deals
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return filePath;
}

// Save location data for a city
async function saveLocations(citySlug, locations) {
  ensureDir(path.join(OUTPUT_BASE, 'locations'));
  const filePath = path.join(OUTPUT_BASE, 'locations', `${citySlug}.json`);

  const output = {
    city_slug: citySlug,
    location_count: locations.length,
    updated_at: new Date().toISOString(),
    locations
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  return filePath;
}

// Build and save combined city deals file (chain deals × locations)
// This is what the frontend reads
async function buildCityDealsFile(citySlug) {
  const chainsDir = path.join(OUTPUT_BASE, 'chains');
  const locationsPath = path.join(OUTPUT_BASE, 'locations', `${citySlug}.json`);

  if (!fs.existsSync(locationsPath)) {
    console.warn(`No location data for ${citySlug}`);
    return;
  }

  const locationData = JSON.parse(fs.readFileSync(locationsPath));
  const locations = locationData.locations;

  if (!locations || locations.length === 0) {
    console.warn(`Zero locations for ${citySlug}, skipping city deal build`);
    return;
  }

  // Group locations by chain slug
  const locationsByChain = {};
  for (const loc of locations) {
    if (!locationsByChain[loc.chain_slug]) {
      locationsByChain[loc.chain_slug] = [];
    }
    locationsByChain[loc.chain_slug].push(loc);
  }

  // For each chain with locations in this city, attach deals
  const cityDeals = [];

  for (const chainSlug of Object.keys(locationsByChain)) {
    const chainFile = path.join(chainsDir, `${chainSlug}.json`);
    if (!fs.existsSync(chainFile)) continue;

    const chainData = JSON.parse(fs.readFileSync(chainFile));
    const chainLocations = locationsByChain[chainSlug];

    for (const deal of chainData.deals) {
      for (const location of chainLocations) {
        cityDeals.push({
          // Deal info
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

          // Location info
          chain_slug: chainSlug,
          location_name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip,
          lat: location.lat,
          lng: location.lng,
          phone: location.phone,
          opening_hours: location.opening_hours
        });
      }
    }
  }

  ensureDir(path.join(OUTPUT_BASE, 'deals'));
  const filePath = path.join(OUTPUT_BASE, 'deals', `${citySlug}.json`);

  const output = {
    city_slug: citySlug,
    deal_count: cityDeals.length,
    updated_at: new Date().toISOString(),
    deals: cityDeals
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`Built ${citySlug}: ${cityDeals.length} deals`);
  return filePath;
}

// Save scraper run metadata
async function saveMeta(stats) {
  ensureDir(OUTPUT_BASE);
  const metaPath = path.join(OUTPUT_BASE, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    last_run: new Date().toISOString(),
    ...stats
  }, null, 2));
}

module.exports = { saveChainDeals, saveLocations, buildCityDealsFile, saveMeta };
