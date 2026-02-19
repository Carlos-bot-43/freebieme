// coupon-sites.js
// Scrapes coupon sites for restaurant deals
// Uses cheerio only (no Playwright needed for these sites)

const axios = require('axios');
const cheerio = require('cheerio');
const chains = require('../../data/chains.json');
const { parseDeal } = require('../parsers/deal-parser');
const { scoreConfidence } = require('../parsers/confidence');
const { saveChainDeals } = require('../utils/export');
const fs = require('fs');
const path = require('path');

const DELAY_MS = 2000;
const TIMEOUT_MS = 15000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Map from RetailMeNot store name to our chain slug
const RMN_CHAIN_MAP = {
  "chick-fil-a": "chick-fil-a",
  "chipotle": "chipotle",
  "starbucks": "starbucks",
  "subway": "subway",
  "mcdonald's": "mcdonalds",
  "mcdonalds": "mcdonalds",
  "dunkin": "dunkin",
  "dunkin'": "dunkin",
  "panera bread": "panera",
  "panera": "panera",
  "taco bell": "taco-bell",
  "burger king": "burger-king",
  "wendy's": "wendys",
  "wendys": "wendys",
  "pizza hut": "pizza-hut",
  "domino's": "dominos",
  "dominos": "dominos",
  "papa john's": "papa-johns",
  "papa johns": "papa-johns",
  "kfc": "kfc",
  "popeyes": "popeyes",
  "sonic": "sonic",
  "sonic drive-in": "sonic",
  "panda express": "panda-express",
  "wingstop": "wingstop",
  "jersey mike's": "jersey-mikes",
  "jersey mikes": "jersey-mikes",
  "raising cane's": "raising-canes",
  "raising canes": "raising-canes"
};

// Scrape RetailMeNot restaurants page
async function scrapeRetailMeNot() {
  console.log('  Scraping RetailMeNot restaurants...');
  const deals = [];

  try {
    const response = await axios.get('https://www.retailmenot.com/browse/restaurants', {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract deals from RetailMeNot page structure
    // They use various selectors - try multiple
    const selectors = [
      'article', '.coupon-card', '.offer-card', '[class*="coupon"]',
      '[class*="offer"]', '[class*="deal"]', '.store-offer'
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text().replace(/\s+/g, ' ').trim();
        const title = $el.find('h2, h3, .title, [class*="title"]').first().text().trim();
        const storeName = $el.find('[class*="store"], [class*="brand"], [class*="merchant"]').first().text().trim().toLowerCase();

        if (!title && !text) return;

        // Find which chain this belongs to
        let chainSlug = null;
        for (const [name, slug] of Object.entries(RMN_CHAIN_MAP)) {
          if (storeName.includes(name) || text.toLowerCase().includes(name)) {
            chainSlug = slug;
            break;
          }
        }

        if (!chainSlug) return;

        const dealText = title || text.substring(0, 200);
        if (dealText.length < 10) return;

        deals.push({ chainSlug, text: dealText, method: 'selector', source: 'retailmenot' });
      });
    }

    // Also try to get store links and extract chain names from hrefs
    $('a[href*="/view/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();

      if (!text || text.length < 10) return;

      // Extract store name from URL pattern like /view/starbucks
      const storeMatch = href.match(/\/view\/([^/?#]+)/);
      if (storeMatch) {
        const storeName = storeMatch[1].toLowerCase().replace(/-/g, ' ');
        const chainSlug = RMN_CHAIN_MAP[storeName] || RMN_CHAIN_MAP[storeMatch[1].toLowerCase()];
        if (chainSlug) {
          deals.push({ chainSlug, text, method: 'selector', source: 'retailmenot' });
        }
      }
    });

    console.log(`    RetailMeNot: found ${deals.length} potential deals`);
    return deals;

  } catch (error) {
    console.warn(`    RetailMeNot scrape failed: ${error.message}`);
    return [];
  }
}

// Process coupon deals for all chains
async function scrapeCouponSites() {
  console.log('\n=== Coupon Sites ===');

  const rmnDeals = await scrapeRetailMeNot();
  await sleep(DELAY_MS);

  // Group by chain
  const dealsByChain = {};
  for (const item of rmnDeals) {
    if (!dealsByChain[item.chainSlug]) {
      dealsByChain[item.chainSlug] = [];
    }
    dealsByChain[item.chainSlug].push(item);
  }

  let totalNew = 0;

  // Merge coupon deals into existing chain files
  for (const [chainSlug, rawDeals] of Object.entries(dealsByChain)) {
    const chainsDir = path.join(__dirname, '../../data/output/chains');
    const chainFile = path.join(chainsDir, `${chainSlug}.json`);

    let existingDeals = [];
    if (fs.existsSync(chainFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(chainFile));
        existingDeals = data.deals || [];
      } catch (e) {
        existingDeals = [];
      }
    }

    const existingTitles = new Set(existingDeals.map(d => d.title?.toLowerCase()));
    const newDeals = [];

    for (const raw of rawDeals) {
      if (existingTitles.has(raw.text.toLowerCase())) continue;

      const parsed = parseDeal(raw.text, chainSlug);
      if (!parsed) continue;

      const confidence = scoreConfidence(parsed, raw.method);
      if (confidence < 0.25) continue;

      const deal = {
        ...parsed,
        chain_slug: chainSlug,
        confidence_score: confidence,
        source: raw.source,
        source_url: 'https://www.retailmenot.com/browse/restaurants',
        scraped_at: new Date().toISOString()
      };

      newDeals.push(deal);
      existingTitles.add(raw.text.toLowerCase());
    }

    if (newDeals.length > 0) {
      const allDeals = [...existingDeals, ...newDeals];
      await saveChainDeals(chainSlug, allDeals);
      totalNew += newDeals.length;
      console.log(`  ${chainSlug}: +${newDeals.length} coupon deals`);
    }
  }

  console.log(`Coupon sites done. Total new deals: ${totalNew}`);
  return totalNew;
}

module.exports = { scrapeCouponSites };

// Run standalone: node scraper/sources/coupon-sites.js
if (require.main === module) {
  scrapeCouponSites()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
