const { fetchCityLocations } = require('./scraper/sources/osm-locations');
const { saveLocations, buildCityDealsFile } = require('./scraper/utils/export');
const cities = require('./data/cities.json');

const TARGETS = ['virginia-beach-va', 'new-orleans-la'];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  for (let i = 0; i < TARGETS.length; i++) {
    const city = cities.find(c => c.slug === TARGETS[i]);
    if (!city) { console.log(`Not found: ${TARGETS[i]}`); continue; }
    console.log(`\n[${i+1}/${TARGETS.length}] ${city.display}`);
    try {
      const locs = await fetchCityLocations(city);
      await saveLocations(city.slug, locs);
      await buildCityDealsFile(city.slug);
      console.log(`  ✅ ${city.slug}: ${locs.length} locations`);
    } catch (err) { console.error(`  ❌ ${err.message}`); }
    if (i < TARGETS.length - 1) { console.log('  Waiting 10s...'); await sleep(10000); }
  }
  console.log('\nDone!');
}

main().catch(console.error);
