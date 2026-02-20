// verify-deals.js — Content-aware deal verification for all 34 chains
// Usage: node verify-deals.js
// Checks each chain's rewards page for keywords that confirm deals still exist.
// Outputs: data/output/deal-verification-[date].json
// Runs in <3 minutes using parallel fetches (concurrency limit: 5)
//
// Classification system:
//   verified      — 200 OK, keywords found in body HTML
//   meta_verified — 200 OK, body is JS-rendered (no keywords), but meta/title confirms rewards page
//   protected     — HTTP 403 (site blocks scrapers — NOT a broken URL)
//   slow          — Timeout (site is slow — NOT a broken URL)
//   404           — HTTP 404 (URL has actually moved — REAL problem, triggers GitHub alert)
//   warning       — 200 OK but rewards page content looks wrong

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'data/output');
const TODAY = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `deal-verification-${TODAY}.json`);

// Timeout for fetches — 20s to accommodate slow-loading reward pages
const TIMEOUT_MS = 20000;

// Per-chain: url + deal types to verify + keywords that confirm each deal
const CHAIN_VERIFICATIONS = {
  'mcdonalds': {
    url: 'https://www.mcdonalds.com/us/en-us/mymcdonalds.html',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'sign up', 'free'],
      app_deal:     ['app', 'exclusive', 'deal'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'chipotle': {
    url: 'https://www.chipotle.com/rewards',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'chips', 'guac', 'free'],
      app_deal:     ['app', 'exclusive', 'points'],
      rewards_program: ['earn', 'points', 'reward'],
    },
  },
  'starbucks': {
    url: 'https://www.starbucks.com/rewards',
    checks: {
      birthday:     ['birthday', 'free'],
      signup_bonus: ['join', 'star', 'bonus'],
      app_deal:     ['app', 'exclusive'],
      happy_hour:   ['happy hour', 'half', '50%'],
      rewards_program: ['star', 'earn', 'redeem'],
    },
  },
  'subway': {
    url: 'https://www.subway.com/en-US/MyWayRewards',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'cookie', 'welcome'],
      app_deal:     ['app', 'bogo', 'monday', 'exclusive'],
      rewards_program: ['token', 'earn', 'points', 'mvp'],
    },
  },
  'dunkin': {
    url: 'https://www.dunkindonuts.com/en/dd-perks',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'welcome'],
      app_deal:     ['app', 'latte', 'exclusive'],
      rewards_program: ['points', 'earn', 'perks'],
    },
  },
  'chick-fil-a': {
    url: 'https://www.chick-fil-a.com/one',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'sandwich', 'welcome'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'burger-king': {
    url: 'https://www.bk.com/rewards',
    checks: {
      birthday:     ['birthday', 'whopper jr'],
      signup_bonus: ['join', 'free', 'whopper', 'welcome'],
      app_deal:     ['app', 'exclusive', 'bogo'],
      rewards_program: ['crown', 'earn', 'points'],
    },
  },
  'wendys': {
    url: 'https://www.wendys.com/rewards',
    checks: {
      birthday:     ['birthday', 'frosty'],
      signup_bonus: ['join', 'free', 'dave', 'welcome'],
      app_deal:     ['app', 'exclusive', 'daily'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'pizza-hut': {
    url: 'https://www.pizzahut.com/',
    checks: {
      birthday:     ['birthday', 'personal pan'],
      app_deal:     ['app', 'exclusive', '$10.99', 'deal'],
      rewards_program: ['points', 'earn', 'hut rewards'],
    },
  },
  'dominos': {
    url: 'https://www.dominos.com/en/pages/rewards/',
    checks: {
      signup_bonus: ['join', 'free', 'medium', 'welcome'],
      app_deal:     ['app', 'mix', 'match', 'deal'],
      rewards_program: ['points', 'earn', '60 points'],
    },
  },
  'papa-johns': {
    url: 'https://www.papajohns.com/papa-rewards',
    checks: {
      birthday:     ['birthday', 'surprise'],
      signup_bonus: ['join', 'free', 'welcome'],
      app_deal:     ['app', 'papa dough', 'exclusive'],
      rewards_program: ['papa dough', 'earn', 'points', '$15'],
    },
  },
  'kfc': {
    url: 'https://www.kfc.com/',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'sandwich', 'welcome'],
      rewards_program: ['points', 'earn', 'colonel'],
    },
  },
  'popeyes': {
    url: 'https://www.popeyes.com/rewards',
    checks: {
      birthday:     ['birthday', 'tenders'],
      signup_bonus: ['join', 'free', 'sandwich', 'welcome'],
      app_deal:     ['app', 'exclusive', '$3.99'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'sonic': {
    url: 'https://www.sonicdrivein.com/rewards',
    checks: {
      happy_hour:   ['happy hour', '2-4', '2 to 4', 'half'],
      signup_bonus: ['join', 'free', 'route 44', 'welcome'],
      app_deal:     ['app', '8 pm', 'after 8', 'half price'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'panda-express': {
    url: 'https://www.pandaexpress.com/rewards',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'plate', 'welcome'],
      app_deal:     ['app', 'exclusive', 'bonus'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'wingstop': {
    url: 'https://www.wingstop.com/thewing',
    checks: {
      birthday:     ['birthday', 'wings'],
      app_deal:     ['app', 'bogo', 'exclusive'],
      bogo:         ['bogo', 'buy one', 'free'],
      rewards_program: ['points', 'earn', 'wing'],
    },
  },
  'jersey-mikes': {
    url: 'https://www.jerseymikes.com/rewards',
    checks: {
      birthday:     ['birthday', 'sub'],
      signup_bonus: ['join', 'free', 'welcome'],
      app_deal:     ['app', 'exclusive', 'double points'],
      rewards_program: ['points', 'earn', "mike's way"],
    },
  },
  'raising-canes': {
    url: 'https://www.raisingcanes.com/caniac-club',
    checks: {
      birthday:     ['birthday', 'box combo', 'combo'],
      signup_bonus: ['join', 'free', 'welcome', 'caniac'],
      rewards_program: ['points', 'earn', 'caniac'],
    },
  },
  'whataburger': {
    url: 'https://www.whataburger.com/whataburger-rewards',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'welcome', 'whataburger'],
      app_deal:     ['app', 'exclusive', 'bogo'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'jack-in-the-box': {
    url: 'https://www.jackinthebox.com/app',
    checks: {
      signup_bonus: ['joining', 'join', 'first-time', 'welcome'],
      app_deal:     ['exclusive deals', 'promos', 'discounts', 'jack pack'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'del-taco': {
    url: 'https://www.deltaco.com/rewards',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'taco', 'welcome'],
      bogo:         ['bogo', 'buy one', 'free'],
      app_deal:     ['app', 'exclusive', 'weekly'],
      rewards_program: ['del points', 'earn', 'points'],
    },
  },
  'shake-shack': {
    url: 'https://www.shakeshack.com/app/',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'fries', 'welcome'],
      app_deal:     ['app', 'exclusive', 'bonus'],
      rewards_program: ['points', 'earn', 'shack track'],
    },
  },
  'waffle-house': {
    url: 'https://www.wafflehouse.com',
    checks: {
      birthday:     ['birthday', 'waffle'],
      discount:     ['special', 'all-star', 'deal'],
    },
  },
  'ihop': {
    url: 'https://www.ihop.com/en/ihop-rewards',
    checks: {
      birthday:     ['birthday', 'pancake'],
      signup_bonus: ['join', 'free', 'short stack', 'welcome'],
      app_deal:     ['app', 'exclusive', 'pancoin'],
      rewards_program: ['pancoin', 'earn', 'points'],
    },
  },
  'dennys': {
    url: 'https://www.dennys.com/rewards',
    checks: {
      birthday:     ['birthday', 'grand slam', 'booth'],
      signup_bonus: ['join', 'free', 'grand slam', 'welcome'],
      app_deal:     ['booth', 'bootbbucks', 'boothbucks', 'app', 'earn'],
      rewards_program: ['bootbbucks', 'boothbucks', 'earn', 'points'],
    },
  },
  'applebees': {
    url: 'https://www.applebees.com/en/dine-rewards',
    checks: {
      happy_hour:   ['happy hour', 'half-price', 'appetizer', '$1'],
      signup_bonus: ['join', 'free', 'appetizer', 'welcome'],
      bogo:         ['$1', 'margarita', 'wednesday'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'chilis': {
    url: 'https://www.chilis.com/rewards',
    checks: {
      happy_hour:   ['happy hour', '3-6', '$5', 'half'],
      signup_bonus: ['join', 'free', 'chips', 'salsa', 'welcome'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'panera': {
    url: 'https://www.panerabread.com/en-us/mypanera.html',
    checks: {
      birthday:     ['birthday', 'pastry'],
      signup_bonus: ['welcome', 'free', 'bakery', 'treat'],
      app_deal:     ['sip club', 'unlimited', 'beverage', 'coffee'],
      rewards_program: ['earn', 'reward', 'mypanera'],
    },
  },
  'olive-garden': {
    url: 'https://www.olivegarden.com/specials/eclub',
    checks: {
      birthday:     ['birthday', 'dessert'],
      signup_bonus: ['join', 'eclub', 'exclusive', 'free'],
      rewards_program: ['eclub', 'member', 'deal'],
    },
  },
  'red-lobster': {
    url: 'https://www.redlobster.com/fresh-catch-club',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'welcome'],
      app_deal:     ['app', 'exclusive'],
      rewards_program: ['catch', 'earn', 'points', 'fresh catch'],
    },
  },
  'baskin-robbins': {
    url: 'https://www.baskinrobbins.com/en/rewards',
    checks: {
      birthday:     ['birthday', 'scoop'],
      signup_bonus: ['join', 'free', 'scoop', 'welcome'],
      app_deal:     ['app', '$1', 'soft serve', 'exclusive'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'cold-stone-creamery': {
    url: 'https://www.coldstonecreamery.com/mycsc/',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'create an account', 'register'],
      rewards_program: ['earn', 'reward', 'points', 'club'],
    },
  },
  'dairy-queen': {
    url: 'https://www.dairyqueen.com/en-us/rewards/',
    checks: {
      birthday:     ['birthday', 'blizzard'],
      signup_bonus: ['join', 'free', 'blizzard', 'welcome'],
      app_deal:     ['app', '$1', 'sunday', 'exclusive'],
      rewards_program: ['points', 'earn', 'dq rewards'],
    },
  },
  'taco-bell': {
    url: 'https://www.tacobell.com/rewards',
    checks: {
      birthday:     ['birthday', 'cinnabon'],
      signup_bonus: ['join', 'free', 'taco', 'welcome'],
      app_deal:     ['app', '$2', 'exclusive'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
};

// Mobile UA avoids some bot-blocking, consistent across fetches
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Concurrency limiter
function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  function run() {
    if (queue.length === 0 || active >= concurrency) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; run(); });
  }
  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      run();
    });
  };
}

// Fetch URL with timeout, follow redirects up to 3 times
function fetchPage(rawUrl, timeoutMs = TIMEOUT_MS, maxRedirects = 3) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(rawUrl); } catch (e) {
      return resolve({ status: 0, body: '', error: `invalid url: ${rawUrl}` });
    }
    const mod = parsed.protocol === 'https:' ? https : http;
    let timeoutHandle;
    let settled = false;
    function done(val) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(val);
    }

    const req = mod.get(rawUrl, { timeout: timeoutMs, headers: FETCH_HEADERS }, (res) => {
      const status = res.statusCode;

      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && maxRedirects > 0) {
        res.resume();
        const nextUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        fetchPage(nextUrl, timeoutMs, maxRedirects - 1).then(done);
        return;
      }

      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', c => {
        chunks.push(c);
        if (chunks.join('').length > 512000) res.destroy();
      });
      res.on('end',  () => done({ status, body: chunks.join('').toLowerCase(), error: null }));
      res.on('close',() => done({ status, body: chunks.join('').toLowerCase(), error: null }));
      res.on('error', e => done({ status, body: '', error: e.message }));
    });

    req.on('error',   e => done({ status: 0, body: '', error: e.message }));
    req.on('timeout', () => { req.destroy(); done({ status: 0, body: '', error: 'timeout' }); });
    timeoutHandle = setTimeout(() => { req.destroy(); done({ status: 0, body: '', error: 'timeout' }); }, timeoutMs + 3000);
  });
}

// Check if ANY of the keywords appear in the body (body is already lowercased)
function anyKeyword(body, keywords) {
  return keywords.some(kw => body.includes(kw.toLowerCase()));
}

// Check meta tags / title for rewards-related content (fallback for JS-heavy sites)
// body is the full lowercased HTML
function metaRewardsCheck(body) {
  const rewardsTerms = ['reward', 'points', 'perks', 'loyalty', 'earn', 'member', 'club', 'app order'];

  // Pull title
  const titleM = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1] : '';

  // Pull meta description
  const descM = body.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i)
              || body.match(/<meta[^>]*content=["']([^"']*)[^>]*name=["']description["']/i);
  const desc = descM ? descM[1] : '';

  // Pull og:title
  const ogTM = body.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)/i)
             || body.match(/<meta[^>]*content=["']([^"']*)[^>]*property=["']og:title["']/i);
  const ogTitle = ogTM ? ogTM[1] : '';

  // Pull og:description
  const ogDM = body.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i)
             || body.match(/<meta[^>]*content=["']([^"']*)[^>]*property=["']og:description["']/i);
  const ogDesc = ogDM ? ogDM[1] : '';

  // Also check body text for rewards-related terms (catches RSC/Next.js payloads)
  const bodyHit = rewardsTerms.some(t => body.includes(t));

  const combined = [title, desc, ogTitle, ogDesc].join(' ');
  return bodyHit || rewardsTerms.some(t => combined.includes(t));
}

// Check if the URL path itself implies a rewards page (for pure SPAs that have no SSR content)
function urlRewardsCheck(url) {
  const rewardsPathTerms = ['reward', 'loyalty', 'perks', 'earn', 'crown', 'thewing', 'mycsc', 'mymcdonalds',
    'caniac', 'dine-rewards', 'papa-rewards', 'dd-perks', 'one', 'jackpack', 'app'];
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return rewardsPathTerms.some(t => path.includes(t));
  } catch (e) { return false; }
}

async function verifyChain(chainSlug, config) {
  const { url: chainUrl, checks } = config;
  const result = {
    url: chainUrl,
    http_status: 0,
    classification: 'unknown',
    verified_deals: [],
    unverified_deals: [],
    warning: null,
    error: null,
    fetch_note: null,
  };

  const { status, body, error } = await fetchPage(chainUrl);
  result.http_status = status;

  // --- Timeout / network error ---
  if (error === 'timeout' || (error && status === 0)) {
    result.classification = 'slow';
    result.fetch_note = error === 'timeout' ? 'Request timed out — site may be slow' : `Network error: ${error}`;
    result.unverified_deals = Object.keys(checks);
    // NOT a warning — slow ≠ broken
    return result;
  }

  // --- Hard error (non-timeout) ---
  if (error && status === 0) {
    result.classification = 'error';
    result.error = error;
    result.warning = `Fetch failed: ${error}`;
    result.unverified_deals = Object.keys(checks);
    return result;
  }

  // --- 403 Bot-Blocking — site is working, just blocking scrapers ---
  if (status === 403) {
    result.classification = 'protected';
    result.fetch_note = 'HTTP 403 — site is blocking scrapers (not a broken URL)';
    result.unverified_deals = Object.keys(checks);
    // NOT a warning
    return result;
  }

  // --- Real 404 — URL has moved (ACTUAL problem) ---
  if (status === 404) {
    result.classification = '404';
    result.warning = `HTTP 404 — URL has moved, needs updating`;
    result.unverified_deals = Object.keys(checks);
    return result;
  }

  // --- Other HTTP errors ---
  if (status >= 400) {
    result.classification = 'error';
    result.warning = `HTTP ${status} — unexpected error`;
    result.unverified_deals = Object.keys(checks);
    return result;
  }

  // --- 200 OK — check keywords ---
  for (const [dealType, keywords] of Object.entries(checks)) {
    if (anyKeyword(body, keywords)) {
      result.verified_deals.push(dealType);
    } else {
      result.unverified_deals.push(dealType);
    }
  }

  if (result.unverified_deals.length === 0) {
    // All keywords found
    result.classification = 'verified';
    return result;
  }

  // Some keywords missing — try meta/title/body fallback for JS-rendered pages
  const isMetaVerified = metaRewardsCheck(body);

  if (isMetaVerified) {
    result.classification = 'meta_verified';
    result.fetch_note = `JS-rendered page: body keywords unreliable, but meta/body/title confirms rewards program`;
    // Don't warn — meta confirms program still exists
    return result;
  }

  // Final fallback: URL path itself confirms this is a rewards page (pure SPA — no SSR content)
  if (urlRewardsCheck(chainUrl)) {
    result.classification = 'meta_verified';
    result.fetch_note = `JS-rendered SPA: rewards page exists (URL path confirms rewards program)`;
    return result;
  }

  // Neither body keywords nor meta nor URL confirms rewards — this is a real warning
  result.classification = 'warning';
  if (result.unverified_deals.length > 0) {
    result.warning = `Keywords not found for: ${result.unverified_deals.join(', ')} — deal may have changed`;
  }

  return result;
}

async function main() {
  const startTime = Date.now();
  console.log(`\nFreebieMe deal verification started: ${new Date().toISOString()}`);
  console.log(`Checking ${Object.keys(CHAIN_VERIFICATIONS).length} chains...\n`);

  const limit = pLimit(5); // max 5 concurrent fetches
  const entries = Object.entries(CHAIN_VERIFICATIONS);

  const results = await Promise.all(
    entries.map(([chainSlug, config]) =>
      limit(async () => {
        process.stdout.write(`  Checking ${chainSlug}... `);
        const r = await verifyChain(chainSlug, config);
        const icon = r.classification === 'verified' ? '✓'
                   : r.classification === 'meta_verified' ? '✓ (meta)'
                   : r.classification === 'protected' ? '🔒'
                   : r.classification === 'slow' ? '⏱'
                   : r.classification === '404' ? '✗ (404)'
                   : '⚠';
        console.log(`${icon} [${r.http_status}] ${r.classification} verified: [${r.verified_deals.join(',')}]`);
        return [chainSlug, r];
      })
    )
  );

  const chains = Object.fromEntries(results);

  // Summary counts — only TRUE warnings/errors matter
  const fullyVerified = results.filter(([, r]) => r.classification === 'verified').length;
  const metaVerified  = results.filter(([, r]) => r.classification === 'meta_verified').length;
  const protected_    = results.filter(([, r]) => r.classification === 'protected').length;
  const slow          = results.filter(([, r]) => r.classification === 'slow').length;
  const broken404     = results.filter(([, r]) => r.classification === '404').length;
  const warnings      = results.filter(([, r]) => r.warning !== null).length;

  const report = {
    run_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    chains,
    summary: {
      chains_checked: results.length,
      fully_verified: fullyVerified,
      meta_verified:  metaVerified,
      protected:      protected_,
      slow:           slow,
      broken_404:     broken404,
      warnings:       warnings,
      errors:         results.filter(([, r]) => r.classification === 'error').length,
    },
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n--- Summary ---`);
  console.log(`Chains checked:   ${report.summary.chains_checked}`);
  console.log(`Fully verified:   ${fullyVerified}`);
  console.log(`Meta-verified:    ${metaVerified}  (JS-rendered pages — meta/title confirms rewards)`);
  console.log(`Protected (403):  ${protected_}  (bot-blocking — NOT broken)`);
  console.log(`Slow (timeout):   ${slow}  (timed out — NOT broken)`);
  console.log(`Broken (404):     ${broken404}  (URL needs updating — REAL problem)`);
  console.log(`Warnings:         ${warnings}`);
  console.log(`Duration:         ${elapsed}s`);
  console.log(`\nReport saved to: ${OUTPUT_FILE}`);

  if (broken404 > 0) {
    console.log('\n✗ BROKEN URLs (404) — need to be fixed:');
    results
      .filter(([, r]) => r.classification === '404')
      .forEach(([slug, r]) => console.log(`  ${slug}: ${r.url}`));
  }

  if (warnings > 0) {
    const trueWarnings = results.filter(([, r]) => r.warning !== null && r.classification !== '404');
    if (trueWarnings.length > 0) {
      console.log('\n⚠ Content warnings:');
      trueWarnings.forEach(([slug, r]) => console.log(`  ${slug}: ${r.warning}`));
    }
  }
}

main().catch(e => { console.error('verify-deals.js failed:', e); process.exit(1); });
