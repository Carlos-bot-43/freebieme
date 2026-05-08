// fetch-new-cities-74.js — Fetch OSM locations and build deal files for 24 NEW cities (cities 51-74)
// Run: node fetch-new-cities-74.js

const { fetchCityLocations } = require('./scraper/sources/osm-locations');
const { saveLocations, buildCityDealsFile } = require('./scraper/utils/export');
const cities = require('./data/cities.json');

// The 24 new cities added for 74-city expansion
const NEW_CITY_SLUGS = [
  'buffalo-ny', 'rochester-ny', 'providence-ri', 'baton-rouge-la', 
  'birmingham-al', 'little-rock-ar', 'columbia-sc', 'greenville-sc',
  'jackson-ms', 'mobile-al', 'huntsville-al', 'chattanooga-tn',
  'knoxville-tn', 'spokane-wa', 'boise-id', 'reno-nv',
  'colorado-springs-co', 'wichita-ks', 'tulsa-ok', 'mcallen-tx',
  'corpus-christi-tx', 'lubbock-tx', 'cape-coral-fl', 'sarasota-fl'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const newCities = cities.filter(c => NEW_CITY_SLUGS.includes(c.slug));
  console.log(`Processing ${newCities.length} new cities...`);

  for (let i = 0; i < newCities.length; i++) {
    const city = newCities[i];
    console.log(`\n[${i + 1}/${newCities.length}] ${city.display}`);
    try {
      const locations = await fetchCityLocations(city);
      await saveLocations(city.slug, locations);
      await buildCityDealsFile(city.slug);
      console.log(`  ✅ Done: ${city.slug} (${locations.length} locations)`);
    } catch (err) {
      console.error(`  ❌ Failed: ${city.slug}: ${err.message}`);
    }
    // Polite delay between cities — longer to avoid rate limit conflicts
    if (i < newCities.length - 1) {
      console.log(`  Waiting 5s before next city...`);
      await sleep(5000);
    }
  }

  console.log('\n✅ All new cities processed!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
