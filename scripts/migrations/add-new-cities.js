// add-new-cities.js — Fetch OSM locations and build deal files for new cities
// Run: node add-new-cities.js

const { fetchCityLocations } = require('./scraper/sources/osm-locations');
const { saveLocations, buildCityDealsFile } = require('./scraper/utils/export');
const cities = require('./data/cities.json');

// The 25 new cities added in Release 4
const NEW_CITY_SLUGS = [
  'baltimore-md', 'detroit-mi', 'memphis-tn', 'louisville-ky', 'columbus-oh',
  'indianapolis-in', 'oklahoma-city-ok', 'el-paso-tx', 'albuquerque-nm', 'tucson-az',
  'fresno-ca', 'sacramento-ca', 'raleigh-nc', 'virginia-beach-va', 'new-orleans-la',
  'salt-lake-city-ut', 'kansas-city-mo', 'st-louis-mo', 'pittsburgh-pa', 'cleveland-oh',
  'cincinnati-oh', 'orlando-fl', 'fort-worth-tx', 'omaha-ne', 'hartford-ct'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const newCities = cities.filter(c => NEW_CITY_SLUGS.includes(c.slug));
  console.log(`Processing ${newCities.length} new cities...`);

  for (const city of newCities) {
    console.log(`\n[${newCities.indexOf(city) + 1}/${newCities.length}] ${city.display}`);
    try {
      const locations = await fetchCityLocations(city);
      await saveLocations(city.slug, locations);
      await buildCityDealsFile(city.slug);
      console.log(`  ✅ Done: ${city.slug}`);
    } catch (err) {
      console.error(`  ❌ Failed: ${city.slug}: ${err.message}`);
    }
    // Polite delay between cities
    if (newCities.indexOf(city) < newCities.length - 1) {
      await sleep(2000);
    }
  }

  console.log('\n✅ All new cities processed!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
