// fix-source-urls.js — Update source_url in all deal files to specific rewards pages
// Run: node fix-source-urls.js

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'data/output/deals');

const CHAIN_REWARDS_URLS = {
  'mcdonalds': 'https://www.mcdonalds.com/us/en-us/mymcdonalds-rewards.html',
  'chipotle': 'https://www.chipotle.com/rewards',
  'starbucks': 'https://www.starbucks.com/rewards',
  'subway': 'https://www.subway.com/en-US/Rewards',
  'dunkin': 'https://www.dunkindonuts.com/en/dd-perks',
  'chick-fil-a': 'https://www.chick-fil-a.com/one',
  'burger-king': 'https://www.bk.com/rewards',
  'wendys': 'https://www.wendys.com/en-us/rewards',
  'pizza-hut': 'https://www.pizzahut.com/hut-rewards',
  'dominos': 'https://www.dominos.com/en/pages/content/locator/rewards.html',
  'papa-johns': 'https://www.papajohns.com/order/papa-rewards',
  'kfc': 'https://www.kfc.com/rewards',
  'popeyes': 'https://www.popeyes.com/rewards',
  'sonic': 'https://www.sonicdrivein.com/app',
  'panda-express': 'https://www.pandaexpress.com/rewards',
  'wingstop': 'https://www.wingstop.com/order/club',
  'jersey-mikes': 'https://www.jerseymikes.com/mikes-way-rewards',
  'raising-canes': 'https://www.raisingcanes.com/caniac-club',
  'whataburger': 'https://www.whataburger.com/rewards',
  'jack-in-the-box': 'https://www.jackinthebox.com/jack-pack',
  'del-taco': 'https://www.deltaco.com/dels-rewards',
  'shake-shack': 'https://www.shakeshack.com/app/',
  'waffle-house': 'https://www.wafflehouse.com/regulars-app/',
  'ihop': 'https://www.ihop.com/en/rewards',
  'dennys': 'https://www.dennys.com/rewards',
  'applebees': 'https://www.applebees.com/en/rewards',
  'chilis': 'https://www.chilis.com/rewards',
  'olive-garden': 'https://www.olivegarden.com/rewards',
  'red-lobster': 'https://www.redlobster.com/rewards',
  'baskin-robbins': 'https://www.baskinrobbins.com/content/baskinrobbins/en/rewards.html',
  'cold-stone-creamery': 'https://www.coldstonecreamery.com/my-cold-stone-club',
  'dairy-queen': 'https://www.dairyqueen.com/en-us/rewards/',
  'taco-bell': 'https://www.tacobell.com/rewards',
  'panera': 'https://www.panerabread.com/en-us/mypanera-rewards.html',
};

let totalUpdated = 0;

for (const file of fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(INPUT_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath));
  const deals = data.deals || [];
  
  let updated = 0;
  for (const deal of deals) {
    const newUrl = CHAIN_REWARDS_URLS[deal.chain_slug];
    if (newUrl && deal.source_url !== newUrl) {
      deal.source_url = newUrl;
      updated++;
    }
  }

  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`${file}: updated ${updated} source URLs`);
    totalUpdated += updated;
  }
}

console.log(`\nTotal updated: ${totalUpdated} source URLs across all cities`);
