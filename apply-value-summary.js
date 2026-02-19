const fs = require('fs');
const path = require('path');
const { getValueSummary } = require('./lib/claim-steps');

const PUBLIC_DIR = path.join(__dirname, 'frontend/public/data/deals');
const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.json'));
let total = 0;

for (const file of files) {
  const fp = path.join(PUBLIC_DIR, file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  if (!data.deals) continue;
  for (const deal of data.deals) {
    deal.value_summary = getValueSummary(deal);
  }
  fs.writeFileSync(fp, JSON.stringify(data));
  total += data.deals.length;
}

console.log(`Done. Applied value_summary to ${total} deals across ${files.length} cities.`);
