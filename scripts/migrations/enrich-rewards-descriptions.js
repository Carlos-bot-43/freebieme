// Updates description field for rewards_program deals in all public city files
const fs = require('fs');
const path = require('path');

const REWARDS_DESCRIPTIONS = {
  'dominos': "Earn 10 points per $10 spent. Get a free medium 2-topping pizza when you reach 60 points (about 6 orders).",
  'starbucks': "Earn Stars on every purchase. 25 Stars = free food/drink. Earn faster with Starbucks+ membership.",
  'chipotle': "Earn 10 points per $1 spent. Free entrée at 1,250 points (~$125 in purchases).",
  'mcdonalds': "Earn points on every order. Redeem for free fries, McCafé drinks, McDoubles and more.",
  'chick-fil-a': "Earn points with every purchase. Free food rewards start at 200 points.",
  'subway': "Earn tokens on every order. 200 tokens = free 6-inch sub. Stack tokens fast with footlongs.",
  'dunkin': "Earn 10 points per $1 spent. 200 points = free any-size drink.",
  'panera': "Earn points on every visit. Free food rewards, free bakery items, free beverages.",
  'wingstop': "Earn 1 point per $1 spent. 70 points = free 6-piece wings.",
  'pizza-hut': "Earn 2 points per $1 spent. 200 points = free personal pizza.",
  'applebees': "Earn points on food and drinks. Rewards typically include free appetizers and desserts.",
  'chilis': "Earn chips on every $1 spent. Free chips & salsa, free desserts, and more.",
  'red-lobster': "Earn points on every visit. Free appetizers, desserts, and entrées as you accumulate points.",
  'dairy-queen': "Earn points on every order. Free Blizzards, sundaes, and more with DQ Rewards.",
  'baskin-robbins': "Earn points with every scoop. Free ice cream rewards starting at 150 points.",
  'burger-king': "Earn Crowns on every order. Redeem for free Whoppers, fries, drinks and more.",
  'wendys': "Earn 10 points per $1 spent. 500 points = free Dave's Single or similar reward.",
  'kfc': "Earn points on every purchase. Redeem for free chicken, tenders, sides and more.",
  'popeyes': "Earn points with every order. Free chicken sandwiches, tenders, and sides as rewards.",
  'sonic': "Earn points on every order. Redeem for free drinks, slushes, and food items.",
  'panda-express': "Earn points with every purchase. Free plates and sides when you accumulate enough points.",
  'jersey-mikes': "Earn points on every sub. Free regular sub or wrap at 75 points.",
  'raising-canes': "Earn points with every order. Free Cane's Sauce, fingers, and more as you earn.",
  'papa-johns': "Earn Papa Rewards points on every order. Free pizza and sides as you accumulate points.",
  'ihop': "Earn points on every visit. Free pancakes, entrees, and more with IHOP Rewards.",
  'dennys': "Earn points with every purchase. Free meals and sides as you accumulate Denny's Rewards.",
  'olive-garden': "Earn points on every visit. Free appetizers, entrées and desserts with Pasta Pass rewards.",
  'jack-in-the-box': "Earn points on every order. Redeem for free tacos, burgers, and combo items.",
  'taco-bell': "Earn points on every order. Free tacos, burritos, and Crunchwraps when you level up.",
  'cold-stone-creamery': "Earn points with every Creation. Free ice cream creations as you accumulate points.",
  'shake-shack': "Earn points on every purchase. Free Shackburgers, fries, and shakes as rewards.",
  'whataburger': "Earn points on every purchase. Free Whataburgers, fries, and more with Whataburger Rewards.",
};

const PUBLIC_DIR = path.join(__dirname, 'frontend/public/data/deals');
const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.json'));

let updatedCount = 0;

for (const file of files) {
  const fp = path.join(PUBLIC_DIR, file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  if (!data.deals) continue;

  let changed = false;
  for (const deal of data.deals) {
    if (deal.deal_type === 'rewards_program') {
      const betterDesc = REWARDS_DESCRIPTIONS[deal.chain_slug];
      if (betterDesc && deal.description !== betterDesc) {
        deal.description = betterDesc;
        changed = true;
        updatedCount++;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(data));
  }
}

console.log(`Done. Updated descriptions for ${updatedCount} rewards_program deals across ${files.length} cities.`);
