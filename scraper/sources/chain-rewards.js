// chain-rewards.js
// Scrapes official chain restaurant reward pages
// Uses Playwright for JS-heavy pages, Cheerio for static HTML

const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');
const chains = require('../../data/chains.json');
const knownDeals = require('../baseline/known-deals.json');
const { parseDeal } = require('../parsers/deal-parser');
const { scoreConfidence } = require('../parsers/confidence');
const { saveChainDeals } = require('../utils/export');

const TIMEOUT_MS = 15000;   // Kill scraper if page doesn't load in 15s
const DELAY_MS = 2000;      // Polite delay between chain scrapes

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Scrape a single chain's rewards page with Playwright
async function scrapeWithPlaywright(chain) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required in GitHub Actions
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    await page.goto(chain.rewards_url, {
      timeout: TIMEOUT_MS,
      waitUntil: 'domcontentloaded'
    });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    const rawDeals = await page.evaluate((chain) => {
      const results = [];

      // Strategy 1: Try configured selectors
      if (chain.selectors.deal_containers) {
        try {
          const containers = document.querySelectorAll(chain.selectors.deal_containers);
          containers.forEach(el => {
            const text = el.innerText?.trim();
            if (text && text.length > 10 && text.length < 500) {
              results.push({ text, method: 'selector' });
            }
          });
        } catch (e) {
          // selector might fail, that's ok
        }
      }

      // Strategy 2: Keyword fallback (always run, deduplicates later)
      const keywords = chain.selectors.fallback_keywords || ['free', 'birthday', 'reward'];
      const allText = document.body.innerText.split('\n');

      allText.forEach(line => {
        const trimmed = line.trim();
        const lower = trimmed.toLowerCase();

        if (
          trimmed.length > 15 &&
          trimmed.length < 300 &&
          keywords.some(kw => lower.includes(kw))
        ) {
          results.push({ text: trimmed, method: 'keyword' });
        }
      });

      return results;
    }, chain);

    await browser.close();
    return rawDeals;

  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Scrape with Cheerio (faster, for static pages)
async function scrapeWithCheerio(chain) {
  const response = await axios.get(chain.rewards_url, {
    timeout: TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FreebieMe/1.0; +https://freebieme.com)'
    }
  });

  const $ = cheerio.load(response.data);
  const results = [];

  // Strategy 1: Try configured selectors
  if (chain.selectors.deal_containers) {
    $(chain.selectors.deal_containers).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10 && text.length < 500) {
        results.push({ text, method: 'selector' });
      }
    });
  }

  // Strategy 2: Keyword search in body text
  const keywords = chain.selectors.fallback_keywords || ['free', 'birthday'];
  const bodyText = $('body').text();
  const lines = bodyText.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (
      trimmed.length > 15 &&
      trimmed.length < 300 &&
      keywords.some(kw => lower.includes(kw))
    ) {
      results.push({ text: trimmed, method: 'keyword' });
    }
  });

  return results;
}

// Process a single chain
async function scrapeChain(chain) {
  console.log(`  Scraping ${chain.name}...`);

  let rawDeals = [];

  try {
    if (chain.scrape_method === 'playwright') {
      rawDeals = await scrapeWithPlaywright(chain);
    } else {
      rawDeals = await scrapeWithCheerio(chain);
    }
  } catch (error) {
    console.warn(`    FAILED: ${chain.name} - ${error.message}`);
    // Return known deals as fallback for this chain
    const fallback = knownDeals.filter(d => d.chain_slug === chain.slug);
    console.log(`    Using ${fallback.length} baseline deals for ${chain.name}`);
    return fallback;
  }

  // Parse + deduplicate raw text into structured deals
  const seenTexts = new Set();
  const deals = [];

  for (const raw of rawDeals) {
    if (seenTexts.has(raw.text)) continue;
    seenTexts.add(raw.text);

    const parsed = parseDeal(raw.text, chain.slug);
    if (!parsed) continue;

    const confidence = scoreConfidence(parsed, raw.method);
    if (confidence < 0.2) continue; // Too noisy, skip

    deals.push({
      ...parsed,
      chain_slug: chain.slug,
      confidence_score: confidence,
      source: 'chain_website',
      source_url: chain.rewards_url,
      scraped_at: new Date().toISOString()
    });
  }

  // Merge with known deals (known deals override scraped with same deal_type)
  const knownForChain = knownDeals.filter(d => d.chain_slug === chain.slug);
  const knownTypes = new Set(knownForChain.map(d => d.deal_type));

  const scrapedNewDeals = deals.filter(d => !knownTypes.has(d.deal_type));
  const merged = [...knownForChain, ...scrapedNewDeals];

  console.log(`    ${chain.name}: ${merged.length} deals (${knownForChain.length} baseline + ${scrapedNewDeals.length} scraped)`);
  return merged;
}

// Main: scrape all chains
async function scrapeAllChains(chainSlugFilter = null) {
  const targetChains = chainSlugFilter
    ? chains.filter(c => c.slug === chainSlugFilter)
    : chains;

  const results = {};
  let totalDeals = 0;
  const failed = [];

  for (const chain of targetChains) {
    const deals = await scrapeChain(chain);
    results[chain.slug] = deals;
    totalDeals += deals.length;
    await saveChainDeals(chain.slug, deals);
    if (targetChains.length > 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nChain scrape complete. Total deals: ${totalDeals}`);
  return results;
}

module.exports = { scrapeAllChains, scrapeChain };

// Run standalone: node scraper/sources/chain-rewards.js chick-fil-a
if (require.main === module) {
  const chainFilter = process.argv[2] || null;
  scrapeAllChains(chainFilter)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}
