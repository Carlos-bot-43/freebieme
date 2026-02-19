// apply-tags.js — Apply food_tags to all public deal files
// Run: node apply-tags.js
// Safe to run multiple times (idempotent)

const fs = require('fs');
const path = require('path');
const { tagDeal } = require('./lib/tag-deals');

const PUBLIC_DIR = path.join(__dirname, 'frontend/public/data/deals');

const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.json'));
let totalDeals = 0;

for (const file of files) {
  const filePath = path.join(PUBLIC_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let changed = false;
  for (const deal of data.deals) {
    const tags = tagDeal(deal);
    const currentTags = JSON.stringify(deal.food_tags || []);
    if (JSON.stringify(tags) !== currentTags) {
      deal.food_tags = tags;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`Tagged ${path.basename(file)}: ${data.deals.length} deals`);
  }
  totalDeals += data.deals.length;
}

console.log(`Done. Tagged ${totalDeals} deals across ${files.length} cities.`);
