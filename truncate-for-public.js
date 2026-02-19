// Generates truncated city deal files for frontend/public/data/deals/
// Limits to 1000 deals per city, with CHAIN DIVERSITY guaranteed.
// Each city will include deals from ALL available chains (not just the highest-priority ones).

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

// Score a deal (lower = better)
function dealScore(deal) {
  const typePriority = DEAL_TYPE_PRIORITY[deal.deal_type] ?? 9;
  // Convert confidence to 0-1 descending (higher confidence = lower score)
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

  // Group deals by chain_slug
  const byChain = {};
  for (const deal of deals) {
    const chain = deal.chain_slug || 'unknown';
    if (!byChain[chain]) byChain[chain] = [];
    byChain[chain].push(deal);
  }

  // Sort each chain's deals by priority (best first)
  for (const chain of Object.keys(byChain)) {
    byChain[chain].sort((a, b) => dealScore(a) - dealScore(b));
  }

  const chains = Object.keys(byChain);
  const numChains = chains.length;

  // Guarantee: each chain gets at least some slots.
  // Strategy: round-robin through chains in deal-priority order, up to LIMIT total deals.
  // This ensures chain diversity while still prioritizing quality within each chain.

  // Step 1: figure out how many deals to take from each chain
  // Give each chain a base allocation of floor(LIMIT / numChains), at least 1
  // Then fill remaining slots by giving chains with the highest-priority remaining deals priority

  const baseAlloc = Math.max(1, Math.floor(LIMIT / numChains));
  const allocation = {};
  for (const chain of chains) {
    allocation[chain] = Math.min(baseAlloc, byChain[chain].length);
  }

  // Calculate remaining slots after base allocation
  let used = chains.reduce((sum, c) => sum + allocation[c], 0);
  let remaining = LIMIT - used;

  // Distribute remaining slots to chains with more deals, prioritizing those with better next deals
  if (remaining > 0) {
    // Build priority queue: chains that still have deals left after base alloc, sorted by next deal quality
    let moreAvailable = chains.filter(c => byChain[c].length > allocation[c]);

    while (remaining > 0 && moreAvailable.length > 0) {
      // Sort by next deal score (lowest = best)
      moreAvailable.sort((a, b) => {
        const nextA = byChain[a][allocation[a]];
        const nextB = byChain[b][allocation[b]];
        return dealScore(nextA) - dealScore(nextB);
      });

      const chain = moreAvailable[0];
      allocation[chain]++;
      remaining--;

      // Remove from moreAvailable if exhausted
      if (allocation[chain] >= byChain[chain].length) {
        moreAvailable = moreAvailable.filter(c => c !== chain);
      }
    }
  }

  // Step 2: collect deals per chain according to allocation
  const selected = [];
  for (const chain of chains) {
    selected.push(...byChain[chain].slice(0, allocation[chain]));
  }

  // Step 3: final sort for display (by deal priority, then confidence)
  selected.sort((a, b) => dealScore(a) - dealScore(b));

  data.deals = selected;
  data.deal_count = selected.length;
  data.truncated_to = LIMIT;

  fs.writeFileSync(path.join(OUTPUT, file), JSON.stringify(data));
  total += selected.length;

  // Show chain distribution
  const chainDist = {};
  for (const d of selected) chainDist[d.chain_slug] = (chainDist[d.chain_slug] || 0) + 1;
  const chainSummary = Object.keys(chainDist).length;
  console.log(`${file}: ${selected.length} deals from ${chainSummary} chains`);
}

console.log(`\nTotal: ${total} deals across ${fs.readdirSync(OUTPUT).length} cities`);
