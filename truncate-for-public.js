// Generates truncated city deal files for frontend/public/data/deals/
// Limits to 1000 deals per city, prioritised by deal type + confidence score
const fs = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, 'data/output/deals');
const OUTPUT = path.join(__dirname, 'frontend/public/data/deals');

const DEAL_TYPE_PRIORITY = {
  birthday: 0, signup_bonus: 1, freebie: 2,
  app_deal: 3, bogo: 4, happy_hour: 5,
  discount: 6, rewards_program: 7, other: 8,
};

const LIMIT = 1000;

fs.mkdirSync(OUTPUT, { recursive: true });

let total = 0;
for (const file of fs.readdirSync(INPUT).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(INPUT, file)));

  // Sort: deal type priority first, then confidence desc
  data.deals.sort((a, b) => {
    const tp = (DEAL_TYPE_PRIORITY[a.deal_type] ?? 9) - (DEAL_TYPE_PRIORITY[b.deal_type] ?? 9);
    if (tp !== 0) return tp;
    return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
  });

  data.deals = data.deals.slice(0, LIMIT);
  data.deal_count = data.deals.length;
  data.truncated_to = LIMIT;

  fs.writeFileSync(path.join(OUTPUT, file), JSON.stringify(data));
  total += data.deals.length;
  console.log(`${file}: ${data.deal_count} deals`);
}
console.log(`\nTotal: ${total} deals across ${fs.readdirSync(OUTPUT).length} cities`);
