// rescrape-critical.js — Full rescrape for critically sparse cities
// Run: node rescrape-critical.js

const { fetchCityLocations } = require('./scraper/sources/osm-locations');
const { saveLocations, buildCityDealsFile } = require('./scraper/utils/export');
const cities = require('./data/cities.json');

// Cities with very sparse chain data that need a full rescrape
const CRITICAL_CITIES = ['fort-worth-tx', 'raleigh-nc', 'hartford-ct'];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const targetCities = cities.filter(c => CRITICAL_CITIES.includes(c.slug));
  console.log(`Full rescraping ${targetCities.length} critical cities for all 34 chains...`);

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
      console.log('  Waiting 8s before next city...');
      await sleep(8000);
    }
  }

  console.log('\n✅ Done! Run truncate-for-public.js to update public files.');
}

main().catch(err => { console.error(err); process.exit(1); });
