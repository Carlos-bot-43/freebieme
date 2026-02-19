const fs = require('fs');
const path = require('path');
const { getClaimType, getClaimSteps, HAPPY_HOUR_DATA } = require('./lib/claim-steps');

const PUBLIC_DIR = path.join(__dirname, 'frontend/public/data/deals');
const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(PUBLIC_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  for (const deal of data.deals) {
    deal.claim_type = getClaimType(deal);
    deal.claim_steps = getClaimSteps(deal);

    // Add structured happy hour data
    if (deal.deal_type === 'happy_hour') {
      const hh = HAPPY_HOUR_DATA[deal.chain_slug];
      if (hh) {
        deal.happy_hour_start = hh.start;   // "14:00"
        deal.happy_hour_end = hh.end;       // "16:00"
        deal.happy_hour_days = hh.days;     // "every day" | "Mon–Fri"
        deal.happy_hour_note = hh.note;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`Applied claim data to ${file}`);
}
console.log(`Done — ${files.length} cities updated.`);
