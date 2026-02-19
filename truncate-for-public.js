// Generates truncated city deal files for frontend/public/data/deals/
// Limits to 1000 deals per city, with CHAIN+DEAL_TYPE DIVERSITY guaranteed.
// Each city will include deals from ALL chain+deal_type combos (not just top chains).

const fs = require('fs');
const path = require('path');
const { tagDeal } = require('./lib/tag-deals');

const INPUT  = path.join(__dirname, 'data/output/deals');
const OUTPUT = path.join(__dirname, 'frontend/public/data/deals');

const DEAL_TYPE_PRIORITY = {
  birthday: 0, signup_bonus: 1, freebie: 2,
  app_deal: 3, bogo: 4, happy_hour: 5,
  discount: 6, rewards_program: 7, other: 8,
};

const LIMIT = 1000;

// Score a deal (lower = better) — used to rank within a group
function dealScore(deal) {
  const typePriority = DEAL_TYPE_PRIORITY[deal.deal_type] ?? 9;
  // Higher confidence = lower score (better)
  const confPenalty = 1 - (deal.confidence_score ?? 0);
  return typePriority * 100 + confPenalty * 10;
}

fs.mkdirSync(OUTPUT, { recursive: true });

let total = 0;

for (const file of fs.readdirSync(INPUT).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(INPUT, file)));
  const deals = data.deals || [];

  if (deals.length === 0) {
    fs.writeFileSync(path.join(OUTPUT, file), JSON.stringify({ ...data, deals: [], deal_count: 0 }));
    continue;
  }

  // === NEW ALGORITHM: Group by chain_slug + deal_type ===
  // This guarantees every unique chain+deal_type combo appears in the output.

  // Step 1: Group deals by chain_slug+deal_type
  const byGroup = {};
  for (const deal of deals) {
    const groupKey = `${deal.chain_slug || 'unknown'}::${deal.deal_type || 'other'}`;
    if (!byGroup[groupKey]) byGroup[groupKey] = [];
    byGroup[groupKey].push(deal);
  }

  // Step 2: Sort each group by confidence (best first) — within same deal_type, sort by score
  for (const key of Object.keys(byGroup)) {
    byGroup[key].sort((a, b) => dealScore(a) - dealScore(b));
  }

  const groups = Object.keys(byGroup);
  const numGroups = groups.length;

  // Step 3: Calculate per-group cap so no single chain+deal_type dominates
  // Cap = max(1, floor(LIMIT / numGroups))
  const perGroupCap = Math.max(1, Math.floor(LIMIT / numGroups));

  // Step 4: First pass — guarantee at least 1 deal from every group
  const allocation = {};
  for (const key of groups) {
    allocation[key] = Math.min(1, byGroup[key].length);
  }

  // Count slots used after first pass
  let used = groups.reduce((sum, k) => sum + allocation[k], 0);
  let remaining = LIMIT - used;

  // Step 5: Second pass — fill remaining slots up to perGroupCap via round-robin
  // Round-robin: each group gets 1 more slot per round until cap or exhausted
  if (remaining > 0) {
    let changed = true;
    while (remaining > 0 && changed) {
      changed = false;
      // Sort groups by their next deal's score (best first) for fair round-robin
      const eligible = groups
        .filter(k => allocation[k] < perGroupCap && allocation[k] < byGroup[k].length)
        .sort((a, b) => {
          const nextA = byGroup[a][allocation[a]];
          const nextB = byGroup[b][allocation[b]];
          return dealScore(nextA) - dealScore(nextB);
        });

      for (const key of eligible) {
        if (remaining <= 0) break;
        allocation[key]++;
        remaining--;
        changed = true;
      }
    }
  }

  // Step 6: If there are still remaining slots (rare — when numGroups is small),
  // allow chains to exceed perGroupCap, again via round-robin with best-deal priority
  if (remaining > 0) {
    let changed = true;
    while (remaining > 0 && changed) {
      changed = false;
      const eligible = groups
        .filter(k => allocation[k] < byGroup[k].length)
        .sort((a, b) => {
          const nextA = byGroup[a][allocation[a]];
          const nextB = byGroup[b][allocation[b]];
          return dealScore(nextA) - dealScore(nextB);
        });

      for (const key of eligible) {
        if (remaining <= 0) break;
        allocation[key]++;
        remaining--;
        changed = true;
      }
    }
  }

  // Step 7: Collect deals per group according to allocation
  const selected = [];
  for (const key of groups) {
    selected.push(...byGroup[key].slice(0, allocation[key]));
  }

  // Step 8: Final sort for display (by deal_type priority, then confidence)
  selected.sort((a, b) => dealScore(a) - dealScore(b));

  // Step 9: Strip large/unused fields to reduce payload size; apply food_tags
  const stripped = selected.map(deal => {
    const { opening_hours, phone, ...rest } = deal;
    rest.food_tags = tagDeal(deal); // deal-level tagging (single source of truth)
    return rest;
  });

  data.deals = stripped;
  data.deal_count = stripped.length;
  data.truncated_to = LIMIT;

  fs.writeFileSync(path.join(OUTPUT, file), JSON.stringify(data));
  total += selected.length;

  // Show chain diversity in output
  const chainTypeSet = new Set(selected.map(d => `${d.chain_slug}::${d.deal_type}`));
  const chainSet = new Set(selected.map(d => d.chain_slug));
  console.log(`${file}: ${selected.length} deals | ${chainSet.size} chains | ${chainTypeSet.size} chain+type combos`);
}

console.log(`\nTotal: ${total} deals across ${fs.readdirSync(OUTPUT).length} cities`);
