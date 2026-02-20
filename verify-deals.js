// verify-deals.js — Content-aware deal verification for all 34 chains
// Usage: node verify-deals.js
// Checks each chain's rewards page for keywords that confirm deals still exist.
// Outputs: data/output/deal-verification-[date].json
// Runs in <3 minutes using parallel fetches (concurrency limit: 5)

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const OUTPUT_DIR = path.join(__dirname, 'data/output');
const TODAY = new Date().toISOString().slice(0, 10);
const OUTPUT_FILE = path.join(OUTPUT_DIR, `deal-verification-${TODAY}.json`);

// Per-chain: url + deal types to verify + keywords that confirm each deal
const CHAIN_VERIFICATIONS = {
  'mcdonalds': {
    url: 'https://www.mcdonalds.com/us/en-us/mcdapp.html',
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
    url: 'https://www.wendys.com/en-us/rewards',
    checks: {
      birthday:     ['birthday', 'frosty'],
      signup_bonus: ['join', 'free', 'dave', 'welcome'],
      app_deal:     ['app', 'exclusive', 'daily'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'pizza-hut': {
    url: 'https://www.pizzahut.com/rewards',
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
    url: 'https://www.kfc.com/rewards',
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
    url: 'https://www.raisingcanes.com/canes-rewards',
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
    url: 'https://www.jackinthebox.com/jack-pack',
    checks: {
      birthday:     ['birthday'],
      signup_bonus: ['join', 'free', 'combo', 'welcome'],
      app_deal:     ['app', 'taco', '2 for', 'exclusive'],
      rewards_program: ['points', 'earn', 'jack pack'],
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
    url: 'https://www.applebees.com/en/rewards',
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
    url: 'https://www.baskinrobbins.com/en/baskin-rewards',
    checks: {
      birthday:     ['birthday', 'scoop'],
      signup_bonus: ['join', 'free', 'scoop', 'welcome'],
      app_deal:     ['app', '$1', 'soft serve', 'exclusive'],
      rewards_program: ['points', 'earn', 'reward'],
    },
  },
  'cold-stone-creamery': {
    url: 'https://www.coldstonecreamery.com/my-cold-stone-club',
    checks: {
      birthday:     ['birthday', 'bogo', 'buy one'],
      signup_bonus: ['join', 'free', 'welcome'],
      rewards_program: ['earn', 'reward', 'cold stone'],
    },
  },
  'dairy-queen': {
    url: 'https://www.dairyqueen.com/en-us/dq-rewards/',
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
function fetchPage(rawUrl, timeoutMs = 12000, maxRedirects = 3) {
  return new Promise((resolve) => {
    const parsed = new URL(rawUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    let timeoutHandle;

    const req = mod.get(rawUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FreebieMe-Verify/1.0; +https://freebieme.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      clearTimeout(timeoutHandle);
      const status = res.statusCode;

      // Follow redirects
      if ((status === 301 || status === 302 || status === 303 || status === 307 || status === 308)
          && res.headers.location && maxRedirects > 0) {
        res.resume();
        const nextUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        fetchPage(nextUrl, timeoutMs, maxRedirects - 1).then(resolve);
        return;
      }

      const chunks = [];
      res.setEncoding('utf8');
      res.on('data', c => {
        chunks.push(c);
        // Stop reading after 500KB — more than enough for keyword checks
        if (chunks.join('').length > 512000) res.destroy();
      });
      res.on('end', () => resolve({ status, body: chunks.join('').toLowerCase(), error: null }));
      res.on('close', () => resolve({ status, body: chunks.join('').toLowerCase(), error: null }));
      res.on('error', e => resolve({ status, body: '', error: e.message }));
    });

    req.on('error', e => { clearTimeout(timeoutHandle); resolve({ status: 0, body: '', error: e.message }); });
    req.on('timeout', () => { clearTimeout(timeoutHandle); req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
    timeoutHandle = setTimeout(() => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); }, timeoutMs + 2000);
  });
}

// Check if ANY of the keywords appear in the body (case-insensitive, body already lowercased)
function anyKeyword(body, keywords) {
  return keywords.some(kw => body.includes(kw.toLowerCase()));
}

async function verifyChain(chainSlug, config) {
  const { url: chainUrl, checks } = config;
  const result = {
    url: chainUrl,
    status: 0,
    verified_deals: [],
    unverified_deals: [],
    warning: null,
    error: null,
    fetch_note: null,
  };

  const { status, body, error } = await fetchPage(chainUrl);
  result.status = status;

  if (error || status === 0) {
    result.error = error || 'no response';
    result.warning = `Fetch failed: ${result.error}`;
    result.unverified_deals = Object.keys(checks);
    return result;
  }

  if (status >= 400) {
    result.warning = `HTTP ${status} — page may have moved`;
    result.unverified_deals = Object.keys(checks);
    return result;
  }

  if (body.length < 200) {
    result.fetch_note = 'Very short response body — JS-heavy page, keyword checks may be unreliable';
    result.warning = 'JS-rendered page: limited content available for verification';
  }

  for (const [dealType, keywords] of Object.entries(checks)) {
    if (anyKeyword(body, keywords)) {
      result.verified_deals.push(dealType);
    } else {
      result.unverified_deals.push(dealType);
    }
  }

  // Only warn if unverified AND page body is long enough to trust
  if (result.unverified_deals.length > 0 && body.length >= 500 && !result.warning) {
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
        const icon = r.error ? '✗' : r.warning ? '⚠' : '✓';
        console.log(`${icon} [${r.status}] verified: [${r.verified_deals.join(',')}]`);
        return [chainSlug, r];
      })
    )
  );

  const chains = Object.fromEntries(results);
  const fullyVerified = results.filter(([, r]) => r.verified_deals.length > 0 && !r.error && !r.warning).length;
  const withWarnings  = results.filter(([, r]) => r.warning).length;
  const withErrors    = results.filter(([, r]) => r.error).length;

  const report = {
    run_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    chains,
    summary: {
      chains_checked: results.length,
      fully_verified: fullyVerified,
      warnings: withWarnings,
      errors: withErrors,
    },
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  console.log(`\n--- Summary ---`);
  console.log(`Chains checked:   ${report.summary.chains_checked}`);
  console.log(`Fully verified:   ${report.summary.fully_verified}`);
  console.log(`With warnings:    ${report.summary.warnings}`);
  console.log(`With errors:      ${report.summary.errors}`);
  console.log(`Duration:         ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`\nReport saved to: ${OUTPUT_FILE}`);

  if (withWarnings > 0) {
    console.log('\n⚠ Chains with warnings:');
    results
      .filter(([, r]) => r.warning)
      .forEach(([slug, r]) => console.log(`  ${slug}: ${r.warning}`));
  }
}

main().catch(e => { console.error('verify-deals.js failed:', e); process.exit(1); });
