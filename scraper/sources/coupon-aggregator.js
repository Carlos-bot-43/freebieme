// coupon-aggregator.js — Scrape coupon aggregator sites and RSS feeds for limited-time promos
// Usage: node scraper/sources/coupon-aggregator.js
//
// Sources:
//   1. RetailMeNot — per-chain pages: https://www.retailmenot.com/view/[domain]
//   2. Slickdeals RSS — https://slickdeals.net/newsearch.php?q=free+food&rss=1
//   3. Reddit r/freebies RSS — https://www.reddit.com/r/freebies.rss?limit=25
//
// Each new deal found is written to data/output/chains/[chain].json with:
//   source: "coupon-site"
//   confidence_score: 0.6
// This is ADDITIVE only — never removes existing deals.

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseDeal } = require('../parsers/deal-parser');
const { saveChainDeals } = require('../utils/export');

const CHAINS_DIR = path.join(__dirname, '../../data/output/chains');
const TIMEOUT_MS = 15000;
const DELAY_MS = 1500;

// All 34 chain slugs with display names and main domains for RetailMeNot
const CHAIN_INFO = {
  'mcdonalds':          { name: "McDonald's",          domain: 'mcdonalds.com' },
  'chipotle':           { name: 'Chipotle',             domain: 'chipotle.com' },
  'starbucks':          { name: 'Starbucks',            domain: 'starbucks.com' },
  'subway':             { name: 'Subway',               domain: 'subway.com' },
  'dunkin':             { name: "Dunkin'",              domain: 'dunkindonuts.com' },
  'chick-fil-a':        { name: 'Chick-fil-A',          domain: 'chick-fil-a.com' },
  'burger-king':        { name: 'Burger King',          domain: 'bk.com' },
  'wendys':             { name: "Wendy's",              domain: 'wendys.com' },
  'pizza-hut':          { name: 'Pizza Hut',            domain: 'pizzahut.com' },
  'dominos':            { name: "Domino's",             domain: 'dominos.com' },
  'papa-johns':         { name: "Papa John's",          domain: 'papajohns.com' },
  'kfc':                { name: 'KFC',                  domain: 'kfc.com' },
  'popeyes':            { name: 'Popeyes',              domain: 'popeyes.com' },
  'sonic':              { name: 'Sonic',                domain: 'sonicdrivein.com' },
  'panda-express':      { name: 'Panda Express',        domain: 'pandaexpress.com' },
  'wingstop':           { name: 'Wingstop',             domain: 'wingstop.com' },
  'jersey-mikes':       { name: "Jersey Mike's",        domain: 'jerseymikes.com' },
  'raising-canes':      { name: "Raising Cane's",       domain: 'raisingcanes.com' },
  'whataburger':        { name: 'Whataburger',          domain: 'whataburger.com' },
  'jack-in-the-box':    { name: 'Jack in the Box',      domain: 'jackinthebox.com' },
  'del-taco':           { name: 'Del Taco',             domain: 'deltaco.com' },
  'shake-shack':        { name: 'Shake Shack',          domain: 'shakeshack.com' },
  'waffle-house':       { name: 'Waffle House',         domain: 'wafflehouse.com' },
  'ihop':               { name: 'IHOP',                 domain: 'ihop.com' },
  'dennys':             { name: "Denny's",              domain: 'dennys.com' },
  'applebees':          { name: "Applebee's",           domain: 'applebees.com' },
  'chilis':             { name: "Chili's",              domain: 'chilis.com' },
  'olive-garden':       { name: 'Olive Garden',         domain: 'olivegarden.com' },
  'red-lobster':        { name: 'Red Lobster',          domain: 'redlobster.com' },
  'baskin-robbins':     { name: 'Baskin-Robbins',       domain: 'baskinrobbins.com' },
  'cold-stone-creamery':{ name: 'Cold Stone Creamery',  domain: 'coldstonecreamery.com' },
  'dairy-queen':        { name: 'Dairy Queen',          domain: 'dairyqueen.com' },
  'taco-bell':          { name: 'Taco Bell',            domain: 'tacobell.com' },
  'panera':             { name: 'Panera Bread',         domain: 'panerabread.com' },
};

// All chain names and aliases (lowercase) → slug for RSS/text matching
const CHAIN_NAME_TO_SLUG = {};
for (const [slug, info] of Object.entries(CHAIN_INFO)) {
  CHAIN_NAME_TO_SLUG[info.name.toLowerCase()] = slug;
  CHAIN_NAME_TO_SLUG[info.domain.replace('.com', '')] = slug;
}
// Extra aliases
const EXTRA_ALIASES = {
  "mcdonald's": 'mcdonalds', 'mcdonalds': 'mcdonalds',
  "domino's": 'dominos', 'dominos': 'dominos',
  "wendy's": 'wendys', "denny's": 'dennys',
  "applebee's": 'applebees', "chili's": 'chilis',
  "papa john's": 'papa-johns', "jersey mike's": 'jersey-mikes',
  "raising cane's": 'raising-canes', "dairy queen": 'dairy-queen',
  'dq': 'dairy-queen', 'bk': 'burger-king',
  'dunkin donuts': 'dunkin', "dunkin' donuts": 'dunkin',
  'cold stone': 'cold-stone-creamery', 'jack in the box': 'jack-in-the-box',
  'del taco': 'del-taco', 'shake shack': 'shake-shack',
  'waffle house': 'waffle-house', 'panda express': 'panda-express',
  'pizza hut': 'pizza-hut', 'taco bell': 'taco-bell',
  'panera bread': 'panera', 'chick fil a': 'chick-fil-a',
  'chick-fil-a': 'chick-fil-a', 'chipotle mexican grill': 'chipotle',
};
for (const [alias, slug] of Object.entries(EXTRA_ALIASES)) {
  CHAIN_NAME_TO_SLUG[alias] = slug;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Simple HTTP GET with timeout + redirect support
function fetchUrl(rawUrl, maxRedirects = 3) {
  return new Promise((resolve) => {
    const parsed = new URL(rawUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    let timer;

    const req = mod.get(rawUrl, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FreebieMe-CouponBot/1.0)',
        'Accept': 'text/html,application/xml,application/rss+xml,application/atom+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      clearTimeout(timer);
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        fetchUrl(next, maxRedirects - 1).then(resolve);
        return;
      }
      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', c => { chunks.push(c); if (chunks.join('').length > 300000) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body: chunks.join(''), error: null }));
      res.on('close', () => resolve({ status: res.statusCode, body: chunks.join(''), error: null }));
      res.on('error', e => resolve({ status: res.statusCode || 0, body: '', error: e.message }));
    });

    req.on('error', e => { clearTimeout(timer); resolve({ status: 0, body: '', error: e.message }); });
    req.on('timeout', () => { clearTimeout(timer); req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
    timer = setTimeout(() => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); }, TIMEOUT_MS + 3000);
  });
}

// Detect which chain slug appears in a text string
function detectChain(text) {
  const lower = text.toLowerCase();
  for (const [name, slug] of Object.entries(CHAIN_NAME_TO_SLUG)) {
    if (lower.includes(name)) return slug;
  }
  return null;
}

// Parse simple XML/RSS items: returns array of { title, description, link }
function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const desc  = (block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
    const link  = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '';
    const cleanTitle = title.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '');
    const cleanDesc  = desc.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').substring(0, 500);
    if (cleanTitle || cleanDesc) items.push({ title: cleanTitle, description: cleanDesc, link: link.trim() });
  }
  return items;
}

// Load existing chain deals
function loadChainDeals(chainSlug) {
  const filePath = path.join(CHAINS_DIR, `${chainSlug}.json`);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath)).deals || [];
  } catch (e) { return []; }
}

// Check if a deal is already known (by title similarity)
function isDuplicate(title, existingDeals) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = norm(title);
  return existingDeals.some(d => norm(d.title || '').includes(normTitle) || normTitle.includes(norm(d.title || '')));
}

// --- Source 1: RetailMeNot per-chain scraping ---
async function scrapeRetailMeNot() {
  console.log('\n[RetailMeNot] Checking per-chain coupon pages...');
  const found = {}; // chainSlug → [{ title, url }]

  // Only check top chains most likely to have coupons listed on RMN
  const rmnChains = [
    { slug: 'mcdonalds',    rmn: 'mcdonalds' },
    { slug: 'subway',       rmn: 'subway' },
    { slug: 'dominos',      rmn: 'dominos' },
    { slug: 'pizza-hut',    rmn: 'pizzahut' },
    { slug: 'papa-johns',   rmn: 'papajohns' },
    { slug: 'burger-king',  rmn: 'burgerking' },
    { slug: 'wendys',       rmn: 'wendys' },
    { slug: 'taco-bell',    rmn: 'tacobell' },
    { slug: 'kfc',          rmn: 'kfc' },
    { slug: 'popeyes',      rmn: 'popeyes' },
    { slug: 'starbucks',    rmn: 'starbucks' },
    { slug: 'chipotle',     rmn: 'chipotle' },
    { slug: 'panera',       rmn: 'panerabread' },
    { slug: 'chick-fil-a',  rmn: 'chickfila' },
    { slug: 'sonic',        rmn: 'sonicdrivein' },
    { slug: 'dairy-queen',  rmn: 'dairyqueen' },
    { slug: 'dunkin',       rmn: 'dunkin' },
    { slug: 'wingstop',     rmn: 'wingstop' },
    { slug: 'panda-express',rmn: 'pandaexpress' },
  ];

  for (const { slug, rmn } of rmnChains) {
    const url = `https://www.retailmenot.com/view/${rmn}.com`;
    const { status, body, error } = await fetchUrl(url);
    await sleep(DELAY_MS);

    if (error || status >= 400) {
      console.log(`  ${slug}: ${error || `HTTP ${status}`} — skipping`);
      continue;
    }

    // Extract coupon text from the page — look for "free" mentions
    const freeMatches = [];
    // Match coupon text blocks (strip HTML)
    const textBlocks = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ');

    // Find sentences/phrases mentioning "free"
    const sentences = textBlocks.split(/[.!?]|(?:\s{2,})/);
    for (const s of sentences) {
      const clean = s.trim();
      if (clean.length > 15 && clean.length < 200 && /free/i.test(clean)) {
        freeMatches.push(clean);
      }
    }

    if (freeMatches.length > 0) {
      found[slug] = freeMatches.slice(0, 5).map(text => ({ text, url }));
      console.log(`  ${slug}: found ${freeMatches.length} "free" mentions`);
    } else {
      console.log(`  ${slug}: no free coupons found`);
    }
  }

  return found;
}

// --- Source 2: Slickdeals RSS ---
async function scrapeSlickdeals() {
  console.log('\n[Slickdeals] Fetching free food RSS feed...');
  const found = {}; // chainSlug → [{ title, link }]

  const url = 'https://slickdeals.net/newsearch.php?q=free+food+restaurant&rss=1';
  const { status, body, error } = await fetchUrl(url);

  if (error || status >= 400) {
    console.log(`  Slickdeals fetch failed: ${error || `HTTP ${status}`}`);
    return found;
  }

  const items = parseRssItems(body);
  console.log(`  Slickdeals: ${items.length} RSS items`);

  for (const { title, description, link } of items) {
    const combined = `${title} ${description}`;
    const chainSlug = detectChain(combined);
    if (!chainSlug) continue;
    if (!found[chainSlug]) found[chainSlug] = [];
    found[chainSlug].push({ text: title || description.substring(0, 200), url: link });
  }

  const total = Object.values(found).reduce((s, a) => s + a.length, 0);
  console.log(`  Matched ${total} Slickdeals items to chains`);
  return found;
}

// --- Source 3: Reddit r/freebies RSS ---
async function scrapeRedditFreebies() {
  console.log('\n[Reddit r/freebies] Fetching RSS...');
  const found = {}; // chainSlug → [{ title, link }]

  const url = 'https://www.reddit.com/r/freebies.rss?limit=25';
  const { status, body, error } = await fetchUrl(url);

  if (error || status >= 400) {
    console.log(`  Reddit fetch failed: ${error || `HTTP ${status}`}`);
    return found;
  }

  // Reddit RSS is Atom format — parse <entry> blocks
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;
  let itemCount = 0;

  while ((match = entryRegex.exec(body)) !== null) {
    const block = match[1];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const content = (block.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] || '';
    const link = (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || '';

    const cleanTitle = title.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    const cleanContent = content.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim().substring(0, 300);

    itemCount++;
    const combined = `${cleanTitle} ${cleanContent}`;
    const chainSlug = detectChain(combined);
    if (!chainSlug) continue;
    if (!found[chainSlug]) found[chainSlug] = [];
    found[chainSlug].push({ text: cleanTitle || cleanContent.substring(0, 150), url: link });
  }

  const total = Object.values(found).reduce((s, a) => s + a.length, 0);
  console.log(`  Reddit r/freebies: ${itemCount} entries, matched ${total} to chains`);
  return found;
}

// --- Merge all found deals into chain output files ---
async function mergeDeals(allFound) {
  const mergeCounts = { added: 0, skipped: 0 };

  for (const [chainSlug, items] of Object.entries(allFound)) {
    if (!items || items.length === 0) continue;

    const existingDeals = loadChainDeals(chainSlug);
    const newDeals = [];

    for (const { text, url } of items) {
      if (!text || text.length < 15) continue;
      if (isDuplicate(text, existingDeals)) { mergeCounts.skipped++; continue; }

      const parsed = parseDeal(text, chainSlug);
      if (!parsed) { mergeCounts.skipped++; continue; }

      // Only add if it looks like a real deal (has free/discount signal)
      if (parsed.deal_type === 'other' && !parsed.free_item) { mergeCounts.skipped++; continue; }

      newDeals.push({
        ...parsed,
        chain_slug: chainSlug,
        confidence_score: 0.6,
        source: 'coupon-site',
        source_url: url || '',
        scraped_at: new Date().toISOString(),
      });
    }

    if (newDeals.length > 0) {
      const allDeals = [...existingDeals, ...newDeals];
      await saveChainDeals(chainSlug, allDeals);
      console.log(`  ${chainSlug}: +${newDeals.length} new coupon deals`);
      mergeCounts.added += newDeals.length;
    }
  }

  return mergeCounts;
}

async function main() {
  console.log(`\nFreebieMe Coupon Aggregator started: ${new Date().toISOString()}`);
  fs.mkdirSync(CHAINS_DIR, { recursive: true });

  // Collect from all sources
  const rmnDeals     = await scrapeRetailMeNot();
  const slickDeals   = await scrapeSlickdeals();
  const redditDeals  = await scrapeRedditFreebies();

  // Merge all sources together
  const allFound = {};
  for (const source of [rmnDeals, slickDeals, redditDeals]) {
    for (const [slug, items] of Object.entries(source)) {
      if (!allFound[slug]) allFound[slug] = [];
      allFound[slug].push(...items);
    }
  }

  // Write to chain files
  const { added, skipped } = await mergeDeals(allFound);

  console.log(`\n--- Coupon Aggregator Summary ---`);
  console.log(`Deals added:   ${added}`);
  console.log(`Deals skipped: ${skipped} (already known or too low quality)`);
  console.log(`Done: ${new Date().toISOString()}`);
}

main().catch(e => { console.error('coupon-aggregator.js failed:', e); process.exit(1); });
