// health-check.js — Weekly verification that chain rewards pages are still live
// Flags HTTP errors or major changes. Does NOT attempt to parse deal content.
const https = require('https');
const { CHAIN_NAMES } = require('./lib/claim-steps');

// NOTE: 403 responses are typically anti-bot blocking, NOT broken pages.
// Only 404 and persistent 0 (connection fail) indicate real issues.
const REWARDS_URLS = {
  'mcdonalds':             'https://www.mcdonalds.com/us/en-us/mymcdonalds.html',       // updated from stale /mymcdonalds-rewards.html
  'chipotle':              'https://www.chipotle.com/rewards',
  'starbucks':             'https://www.starbucks.com/rewards',
  'subway':                'https://www.subway.com/en-US/MyWayRewards',                   // updated from /en-US/Rewards
  'dunkin':                'https://www.dunkindonuts.com/en/dd-perks',
  'chick-fil-a':           'https://www.chick-fil-a.com/one',
  'burger-king':           'https://www.bk.com/rewards',
  'wendys':                'https://www.wendys.com/en-us/rewards',
  'pizza-hut':             'https://www.pizzahut.com/rewards',                            // updated from /hut-rewards
  'dominos':               'https://www.dominos.com/en/pages/rewards/',                   // updated from stale /locator/rewards.html
  'kfc':                   'https://www.kfc.com/rewards',                                 // 403 = anti-bot, page exists
  'popeyes':               'https://www.popeyes.com/rewards',
  'sonic':                 'https://www.sonicdrivein.com/app',
  'dairy-queen':           'https://www.dairyqueen.com/en-us/rewards/',                   // 403 = anti-bot, page exists
  'ihop':                  'https://www.ihop.com/en/rewards',
  'dennys':                'https://www.dennys.com/rewards',
  'taco-bell':             'https://www.tacobell.com/rewards',
  'panera':                'https://www.panerabread.com/en-us/mypanera.html',              // updated from stale /mypanera-rewards.html
  'applebees':             'https://www.applebees.com/en/rewards',                        // 403 = anti-bot, page exists
  'chilis':                'https://www.chilis.com/rewards',
  'wingstop':              'https://www.wingstop.com/order/club',
  'panda-express':         'https://www.pandaexpress.com/rewards',                        // 403 = anti-bot, page exists
  'baskin-robbins':        'https://www.baskinrobbins.com/content/baskinrobbins/en/rewards.html',
  'noodles-and-company':   'https://www.noodles.com/rewards',                             // new chain added Mar 27, 2026
};

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreebieMe-HealthCheck/1.0)' }
    }, (res) => {
      // 403 = anti-bot blocking (page likely exists), treat as soft-ok
      const isBotBlock = res.statusCode === 403;
      resolve({ url, status: res.statusCode, ok: res.statusCode < 400 || isBotBlock, botBlock: isBotBlock });
      res.resume();
    });
    req.on('error', () => resolve({ url, status: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 0, ok: false }); });
  });
}

async function main() {
  console.log(`Health check started: ${new Date().toISOString()}`);
  const results = await Promise.all(
    Object.entries(REWARDS_URLS).map(([chain, url]) => checkUrl(url))
  );

  const failed = results.filter(r => !r.ok);
  const botBlocked = results.filter(r => r.botBlock);
  console.log(`\nChecked ${results.length} chains. ${failed.length} real issue(s), ${botBlocked.length} anti-bot block(s).`);

  if (failed.length > 0) {
    console.log('\nACTION NEEDED — These chain reward pages may be down or moved:');
    failed.forEach(r => console.log(`  ${r.url} — HTTP ${r.status}`));
  }

  if (botBlocked.length > 0) {
    console.log('\nINFO — Anti-bot blocks (403) — pages likely exist, health check cannot verify:');
    botBlocked.forEach(r => console.log(`  ${r.url} — HTTP ${r.status} (bot block)`));
  }

  console.log('\nAll results:');
  results.forEach(r => {
    const icon = r.ok ? (r.botBlock ? '⚠' : '✓') : '✗';
    console.log(`${icon} [${r.status}] ${r.url}`);
  });
}

main().catch(console.error);
