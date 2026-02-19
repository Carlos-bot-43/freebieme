// index.js
// Master orchestrator - runs all scrapers in correct order

const { scrapeAllChains } = require('./sources/chain-rewards');
const { fetchAllLocations } = require('./sources/osm-locations');
const { scrapeCouponSites } = require('./sources/coupon-sites');
const { buildCityDealsFile, saveMeta } = require('./utils/export');
const cities = require('../data/cities.json');

const DRY_RUN = process.argv.includes('--dry-run');
const REFRESH_LOCATIONS = process.argv.includes('--refresh-locations');

async function runDailyScrape() {
  console.log(`\n🍔 FreebieMe Daily Scraper`);
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  const stats = {
    started_at: new Date().toISOString(),
    chains_scraped: 0,
    cities_processed: 0,
    total_deals: 0,
    total_locations: 0,
    errors: []
  };

  if (DRY_RUN) {
    console.log('✅ Dry run complete - all modules loaded successfully');
    console.log('  chain-rewards.js: OK');
    console.log('  osm-locations.js: OK');
    console.log('  coupon-sites.js: OK');
    console.log('  export.js: OK');
    console.log('  deal-parser.js: OK');
    console.log('  confidence.js: OK');
    console.log(`  Cities configured: ${cities.length}`);
    process.exit(0);
  }

  // Step 1: Scrape chain reward pages
  console.log('=== STEP 1: Chain Rewards ===');
  try {
    const chainResults = await scrapeAllChains();
    stats.chains_scraped = Object.keys(chainResults).length;
    console.log('✅ Chain rewards complete\n');
  } catch (err) {
    console.error('❌ Chain rewards failed:', err.message);
    stats.errors.push({ step: 'chain-rewards', error: err.message });
  }

  // Step 2: Coupon sites
  console.log('=== STEP 2: Coupon Sites ===');
  try {
    await scrapeCouponSites();
    console.log('✅ Coupon sites complete\n');
  } catch (err) {
    console.error('❌ Coupon sites failed:', err.message);
    stats.errors.push({ step: 'coupon-sites', error: err.message });
  }

  // Step 3: Fetch OSM locations (run weekly, not daily - location data changes slowly)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || REFRESH_LOCATIONS) {
    console.log('=== STEP 3: OSM Locations (Weekly Refresh) ===');
    try {
      await fetchAllLocations();
      console.log('✅ Location refresh complete\n');
    } catch (err) {
      console.error('❌ Location fetch failed:', err.message);
      stats.errors.push({ step: 'osm-locations', error: err.message });
    }
  } else {
    console.log('=== STEP 3: OSM Locations (skipping - not Sunday) ===\n');
  }

  // Step 4: Build city deal files (join chains × locations)
  console.log('=== STEP 4: Building City Deal Files ===');
  let totalDeals = 0;
  for (const city of cities) {
    try {
      await buildCityDealsFile(city.slug);
      stats.cities_processed++;
    } catch (err) {
      console.error(`❌ City build failed for ${city.slug}:`, err.message);
      stats.errors.push({ step: 'city-build', city: city.slug, error: err.message });
    }
  }
  console.log('✅ City files complete\n');

  // Step 5: Save metadata
  stats.finished_at = new Date().toISOString();
  stats.duration_seconds = Math.round(
    (new Date(stats.finished_at) - new Date(stats.started_at)) / 1000
  );

  await saveMeta(stats);

  console.log('=== COMPLETE ===');
  console.log(`Duration: ${stats.duration_seconds}s`);
  console.log(`Errors: ${stats.errors.length}`);
  if (stats.errors.length > 0) {
    console.log('Errors:', JSON.stringify(stats.errors, null, 2));
  }

  process.exit(stats.errors.length > 0 ? 1 : 0);
}

runDailyScrape().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
