// osm-locations.js
// Fetches restaurant locations from OpenStreetMap Overpass API
// Completely free, no API key, unlimited calls

const axios = require('axios');
const chains = require('../../data/chains.json');
const cities = require('../../data/cities.json');
const { saveLocations } = require('../utils/export');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const INTER_CITY_DELAY_MS = 2000;
const INTER_BATCH_DELAY_MS = 1000;
// Batch size: number of chain name variants per Overpass query
// Smaller = fewer results per request = avoids 400 maxsize errors on large cities
const BATCH_SIZE = 5;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build Overpass query for a slice of chain name variants
function buildBatchQuery(city, chainNameVariants) {
  const { min_lat, max_lat, min_lng, max_lng } = city.bbox;
  const bbox = `${min_lat},${min_lng},${max_lat},${max_lng}`;

  const nodeFilters = chainNameVariants
    .map(name => `node["name"="${name}"](${bbox});`)
    .join('\n      ');

  const wayFilters = chainNameVariants
    .map(name => `way["name"="${name}"](${bbox});`)
    .join('\n      ');

  return `
[out:json][timeout:35];
(
  ${nodeFilters}
  ${wayFilters}
);
out center;
`;
}

// Normalize chain name from OSM to match our slug
function matchChainSlug(osmName) {
  if (!osmName) return null;
  for (const chain of chains) {
    const normalized = osmName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const variant of chain.osm_name_variants) {
      const normalizedVariant = variant.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized === normalizedVariant) {
        return chain.slug;
      }
    }
  }
  return null;
}

// Parse raw OSM elements into location records
function parseElements(elements, city) {
  return elements
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
        lat,
        lng: lon,
        address: [
          el.tags['addr:housenumber'],
          el.tags['addr:street']
        ].filter(Boolean).join(' ') || null,
        city: el.tags['addr:city'] || city.name,
        state: el.tags['addr:state'] || null,
        zip: el.tags['addr:postcode'] || null,
        phone: el.tags.phone || el.tags['contact:phone'] || null,
        website: el.tags.website || el.tags['contact:website'] || null,
        opening_hours: el.tags.opening_hours || null,
        fetched_at: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

// Run a single Overpass batch query
async function runBatchQuery(city, variantBatch) {
  const query = buildBatchQuery(city, variantBatch);
  const response = await axios.post(
    OVERPASS_URL,
    `data=${encodeURIComponent(query)}`,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 40000
    }
  );
  return response.data.elements || [];
}

// Fetch locations for a single city using batched queries
async function fetchCityLocations(city) {
  console.log(`  Fetching OSM locations for ${city.display}...`);

  // Get all chain name variants we're looking for
  const allVariants = chains.flatMap(c => c.osm_name_variants);

  // Split into batches to avoid Overpass maxsize errors on large cities
  const batches = [];
  for (let i = 0; i < allVariants.length; i += BATCH_SIZE) {
    batches.push(allVariants.slice(i, i + BATCH_SIZE));
  }

  const allElements = [];

  for (let i = 0; i < batches.length; i++) {
    try {
      const elements = await runBatchQuery(city, batches[i]);
      allElements.push(...elements);
      if (i < batches.length - 1) {
        await sleep(INTER_BATCH_DELAY_MS);
      }
    } catch (error) {
      console.warn(`    Batch ${i + 1}/${batches.length} failed for ${city.display}: ${error.message}`);
      // Continue with other batches
    }
  }

  const locations = parseElements(allElements, city);

  // De-duplicate by osm_id
  const seen = new Set();
  const unique = locations.filter(loc => {
    if (seen.has(loc.osm_id)) return false;
    seen.add(loc.osm_id);
    return true;
  });

  console.log(`    Found ${unique.length} chain locations in ${city.display}`);
  return unique;
}

// Main: fetch locations for all cities
async function fetchAllLocations(citySlugFilter = null) {
  const targetCities = citySlugFilter
    ? cities.filter(c => c.slug === citySlugFilter)
    : cities.sort((a, b) => a.priority - b.priority);

  const allLocations = {};

  for (const city of targetCities) {
    const locations = await fetchCityLocations(city);
    allLocations[city.slug] = locations;
    await saveLocations(city.slug, locations);
    if (targetCities.length > 1) {
      await sleep(INTER_CITY_DELAY_MS);
    }
  }

  const total = Object.values(allLocations).reduce((sum, locs) => sum + locs.length, 0);
  console.log(`\nOSM fetch complete. Total locations: ${total}`);
  return allLocations;
}

module.exports = { fetchAllLocations, fetchCityLocations };

// Run standalone: node scraper/sources/osm-locations.js richmond-va
if (require.main === module) {
  const cityFilter = process.argv[2] || null;
  fetchAllLocations(cityFilter)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
