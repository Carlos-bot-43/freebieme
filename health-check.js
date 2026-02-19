// health-check.js — Weekly verification that chain rewards pages are still live
// Flags HTTP errors or major changes. Does NOT attempt to parse deal content.
const https = require('https');
const { CHAIN_NAMES } = require('./lib/claim-steps');

const REWARDS_URLS = {
  'mcdonalds':         'https://www.mcdonalds.com/us/en-us/mymcdonalds-rewards.html',
  'chipotle':          'https://www.chipotle.com/rewards',
  'starbucks':         'https://www.starbucks.com/rewards',
  'subway':            'https://www.subway.com/en-US/Rewards',
  'dunkin':            'https://www.dunkindonuts.com/en/dd-perks',
  'chick-fil-a':       'https://www.chick-fil-a.com/one',
  'burger-king':       'https://www.bk.com/rewards',
  'wendys':            'https://www.wendys.com/en-us/rewards',
  'pizza-hut':         'https://www.pizzahut.com/hut-rewards',
  'dominos':           'https://www.dominos.com/en/pages/content/locator/rewards.html',
  'kfc':               'https://www.kfc.com/rewards',
  'popeyes':           'https://www.popeyes.com/rewards',
  'sonic':             'https://www.sonicdrivein.com/app',
  'dairy-queen':       'https://www.dairyqueen.com/en-us/rewards/',
  'ihop':              'https://www.ihop.com/en/rewards',
  'dennys':            'https://www.dennys.com/rewards',
  'taco-bell':         'https://www.tacobell.com/rewards',
  'panera':            'https://www.panerabread.com/en-us/mypanera-rewards.html',
  'applebees':         'https://www.applebees.com/en/rewards',
  'chilis':            'https://www.chilis.com/rewards',
  'wingstop':          'https://www.wingstop.com/order/club',
  'panda-express':     'https://www.pandaexpress.com/rewards',
  'baskin-robbins':    'https://www.baskinrobbins.com/content/baskinrobbins/en/rewards.html',
};

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FreebieMe-HealthCheck/1.0)' }
    }, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode < 400 });
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
  console.log(`\nChecked ${results.length} chains. ${failed.length} issue(s) found.`);

  if (failed.length > 0) {
    console.log('\nWARNINGS — These chain reward pages may be down or moved:');
    failed.forEach(r => console.log(`  ${r.url} — HTTP ${r.status}`));
    // Exit with warning but not failure (don't break CI)
  }

  console.log('\nAll results:');
  results.forEach(r => console.log(`${r.ok ? '✓' : '✗'} [${r.status}] ${r.url}`));
}

main().catch(console.error);
