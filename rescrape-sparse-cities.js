// rescrape-sparse-cities.js — Re-fetch OSM locations for cities with sparse chain data
// Run: node rescrape-sparse-cities.js

const { fetchCityLocations } = require('./scraper/sources/osm-locations');
const { saveLocations, buildCityDealsFile } = require('./scraper/utils/export');
const cities = require('./data/cities.json');

// Cities where the original scrape missed many chains (< 10 chains or < 500 locations)
const SPARSE_CITIES = ['fort-worth-tx', 'raleigh-nc', 'fresno-ca', 'orlando-fl', 'cincinnati-oh'];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const targetCities = cities.filter(c => SPARSE_CITIES.includes(c.slug));
  console.log(`Re-scraping ${targetCities.length} sparse cities...`);

  for (let i = 0; i < targetCities.length; i++) {
    const city = targetCities[i];
    console.log(`\n[${i + 1}/${targetCities.length}] ${city.display}`);
    try {
      const locations = await fetchCityLocations(city);
      await saveLocations(city.slug, locations);
      await buildCityDealsFile(city.slug);
      console.log(`  ✅ Done: ${city.slug} (${locations.length} locations)`);
    } catch (err) {
      console.error(`  ❌ Failed: ${city.slug}: ${err.message}`);
    }
    if (i < targetCities.length - 1) {
      console.log('  Waiting 5s...');
      await sleep(5000);
    }
  }

  console.log('\n✅ Done! Run truncate-for-public.js to update public files.');
}

main().catch(err => { console.error(err); process.exit(1); });
