// Generates truncated city deal files for frontend/public/data/deals/
// Limits to 1000 deals per city, with CHAIN+DEAL_TYPE DIVERSITY guaranteed.
// Each city will include deals from ALL chain+deal_type combos (not just top chains).
//
// SELF-HEALING GUARD: if the new deal count drops >5% vs the previous run,
// the script aborts and keeps existing files to prevent data loss from bad runs.

const fs = require('fs');
const path = require('path');
const { tagDeal } = require('./lib/tag-deals');
const { getClaimType, getClaimSteps, getValueSummary, HAPPY_HOUR_DATA } = require('./lib/claim-steps');

const INPUT  = path.join(__dirname, 'data/output/deals');
const OUTPUT = path.join(__dirname, 'frontend/public/data/deals');
const DATA_DIR = path.join(__dirname, 'data');
const LAST_GOOD_RUN_FILE = path.join(DATA_DIR, 'last-good-run.json');
const DEAL_CHANGELOG_FILE = path.join(DATA_DIR, 'deal-changelog.json');

// Count total deals in a directory of JSON city files
function countDealsInDir(dir) {
  let total = 0;
  const chainCounts = {};
  if (!fs.existsSync(dir)) return { total: 0, cities: 0, chainCounts: {}, cityCounts: {} };
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const cityCounts = {};
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file)));
      const deals = data.deals || [];
      total += deals.length;
      cityCounts[file.replace('.json', '')] = deals.length;
      for (const deal of deals) {
        const slug = deal.chain_slug || 'unknown';
        chainCounts[slug] = (chainCounts[slug] || 0) + 1;
      }
    } catch (e) { /* skip bad files */ }
  }
  return { total, cities: files.length, chainCounts, cityCounts };
}

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

// --- Self-healing guard: snapshot the current OUTPUT state BEFORE we write ---
const prevState = countDealsInDir(OUTPUT);
const prevTotal = prevState.total;
if (prevTotal > 0) {
  console.log(`Previous deal count: ${prevTotal} deals across ${prevState.cities} cities`);
}

// Collect all new file outputs in memory first — don't write until guard passes
const pendingWrites = []; // { file, content, dealCount }
let total = 0;

for (const file of fs.readdirSync(INPUT).filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(INPUT, file)));
  const deals = data.deals || [];

  if (deals.length === 0) {
    pendingWrites.push({ file, content: JSON.stringify({ ...data, deals: [], deal_count: 0 }), dealCount: 0 });
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

  // Step 9: Strip large/unused fields to reduce payload size; apply food_tags + claim data
  const stripped = selected.map(deal => {
    const { opening_hours, phone, ...rest } = deal;
    rest.food_tags = tagDeal(deal); // deal-level tagging (single source of truth)
    rest.claim_type = getClaimType(deal);
    rest.claim_steps = getClaimSteps(deal);
    rest.value_summary = getValueSummary(deal);
    // Add structured happy hour data
    if (deal.deal_type === 'happy_hour') {
      const hh = HAPPY_HOUR_DATA[deal.chain_slug];
      if (hh) {
        rest.happy_hour_start = hh.start;
        rest.happy_hour_end = hh.end;
        rest.happy_hour_days = hh.days;
        rest.happy_hour_note = hh.note;
      }
    }
    return rest;
  });

  data.deals = stripped;
  data.deal_count = stripped.length;
  data.truncated_to = LIMIT;

  // Buffer the write — don't commit to disk yet
  pendingWrites.push({ file, content: JSON.stringify(data), dealCount: stripped.length });
  total += selected.length;

  // Show chain diversity in output
  const chainTypeSet = new Set(selected.map(d => `${d.chain_slug}::${d.deal_type}`));
  const chainSet = new Set(selected.map(d => d.chain_slug));
  console.log(`${file}: ${selected.length} deals | ${chainSet.size} chains | ${chainTypeSet.size} chain+type combos`);
}

// === SELF-HEALING GUARD ===
const newTotal = total;
const DROP_THRESHOLD = 0.05; // 5%

if (prevTotal > 0 && newTotal < prevTotal * (1 - DROP_THRESHOLD)) {
  const dropPct = (((prevTotal - newTotal) / prevTotal) * 100).toFixed(1);
  console.error(`\nERROR: Deal count dropped from ${prevTotal} to ${newTotal} (${dropPct}% decrease, threshold is ${DROP_THRESHOLD * 100}%).`);
  console.error('Keeping existing files. Investigate the input data before re-running.');

  // Log which cities had big drops
  const prevCityCounts = prevState.cityCounts || {};
  const newCityCounts = {};
  for (const { file, dealCount } of pendingWrites) {
    newCityCounts[file.replace('.json', '')] = dealCount;
  }
  const bigDrops = Object.entries(newCityCounts)
    .filter(([city, n]) => prevCityCounts[city] && n < prevCityCounts[city] * 0.8)
    .map(([city, n]) => `  ${city}: ${prevCityCounts[city]} → ${n}`);
  if (bigDrops.length > 0) {
    console.error('Cities with >20% deal loss:');
    bigDrops.forEach(l => console.error(l));
  }
  process.exit(1);
}

// Guard passed — write all files
for (const { file, content } of pendingWrites) {
  fs.writeFileSync(path.join(OUTPUT, file), content);
}
console.log(`\nTotal: ${total} deals across ${pendingWrites.length} cities`);

// Also write empty cities (zero deals)
const emptyCount = fs.readdirSync(OUTPUT).length - pendingWrites.length;
if (emptyCount < 0) {
  // New cities added, no problem
}

// === UPDATE last-good-run.json ===
const chainsWithDeals = new Set();
for (const { content } of pendingWrites) {
  try {
    const data = JSON.parse(content);
    for (const deal of (data.deals || [])) {
      if (deal.chain_slug) chainsWithDeals.add(deal.chain_slug);
    }
  } catch (e) {}
}

const lastGoodRun = {
  run_at: new Date().toISOString(),
  total_deals: total,
  cities: pendingWrites.length,
  chains_with_deals: chainsWithDeals.size,
};
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(LAST_GOOD_RUN_FILE, JSON.stringify(lastGoodRun, null, 2));
console.log(`\nLast good run saved: ${total} deals, ${pendingWrites.length} cities, ${chainsWithDeals.size} chains`);

// === UPDATE deal-changelog.json ===
try {
  const today = new Date().toISOString().slice(0, 10);
  let changelog = [];
  if (fs.existsSync(DEAL_CHANGELOG_FILE)) {
    try { changelog = JSON.parse(fs.readFileSync(DEAL_CHANGELOG_FILE)); } catch (e) {}
  }

  // Compute simple diff vs previous run
  const prevCityMap = {};
  if (prevState.cityCounts) {
    Object.assign(prevCityMap, prevState.cityCounts);
  }
  const newCityMap = {};
  for (const { file, dealCount } of pendingWrites) {
    newCityMap[file.replace('.json', '')] = dealCount;
  }

  const dealsAdded = [];
  const dealsRemoved = [];
  for (const [city, newCount] of Object.entries(newCityMap)) {
    const prevCount = prevCityMap[city] || 0;
    if (newCount > prevCount) dealsAdded.push({ city, added: newCount - prevCount });
    else if (newCount < prevCount) dealsRemoved.push({ city, removed: prevCount - newCount });
  }

  const entry = {
    date: today,
    deals_added: dealsAdded,
    deals_removed: dealsRemoved,
    deals_changed: [],
    total_after: total,
    prev_total: prevTotal,
  };

  changelog.push(entry);
  // Keep only last 30 entries
  if (changelog.length > 30) changelog = changelog.slice(-30);

  fs.writeFileSync(DEAL_CHANGELOG_FILE, JSON.stringify(changelog, null, 2));
  console.log(`Changelog updated (${changelog.length} entries, last 30 kept).`);
} catch (e) {
  console.warn('Changelog update failed (non-fatal):', e.message);
}
