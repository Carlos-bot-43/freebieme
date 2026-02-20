// generate-chain-coverage.js — Creates data/chain-coverage-report.md
// Usage: node generate-chain-coverage.js
// Shows every chain, deal types it has, and its verification status

'use strict';

const fs   = require('fs');
const path = require('path');

const CHAINS_DIR  = path.join(__dirname, 'data/output/chains');
const OUTPUT_DIR  = path.join(__dirname, 'data');
const TODAY       = new Date().toISOString().slice(0, 10);
const VERIFY_FILE = path.join(OUTPUT_DIR, 'output', `deal-verification-${TODAY}.json`);
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'chain-coverage-report.md');

// All deal types to track in the report
const DEAL_TYPES = ['birthday', 'signup_bonus', 'app_deal', 'happy_hour', 'rewards_program', 'bogo', 'freebie'];
const DEAL_LABELS = {
  birthday:       'Birthday',
  signup_bonus:   'Signup',
  app_deal:       'App Deal',
  happy_hour:     'Happy Hour',
  rewards_program:'Rewards',
  bogo:           'BOGO',
  freebie:        'Freebie',
};

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return null; }
}

// Pretty name from slug
function prettyName(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Classification → short label
function classLabel(classification) {
  switch (classification) {
    case 'verified':      return '✅ verified';
    case 'meta_verified': return '✅ meta';
    case 'protected':     return '🔒 protected';
    case 'slow':          return '⏱ slow';
    case '404':           return '❌ 404';
    case 'warning':       return '⚠️ warning';
    default:              return '❓ unknown';
  }
}

function main() {
  // Load verification data
  const verify = readJSON(VERIFY_FILE) || {};
  const verifyChains = verify.chains || {};

  // Load all chain files
  let chainFiles = [];
  try {
    chainFiles = fs.readdirSync(CHAINS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort();
  } catch (e) {
    console.error('Could not read chains directory:', e.message);
  }

  const rows = [];

  for (const file of chainFiles) {
    const slug  = file.replace('.json', '');
    const chain = readJSON(path.join(CHAINS_DIR, file));
    if (!chain) continue;

    const deals = chain.deals || [];
    const dealTypeSet = new Set(deals.map(d => d.deal_type));

    // Get deal count for each type
    const dealCounts = {};
    for (const deal of deals) {
      dealCounts[deal.deal_type] = (dealCounts[deal.deal_type] || 0) + 1;
    }

    // Verification status
    const vChain = verifyChains[slug] || {};
    const classification = vChain.classification || 'unknown';
    const verifiedDeals  = new Set(vChain.verified_deals || []);
    const warning        = vChain.warning || '';

    // Build row
    const typeColumns = DEAL_TYPES.map(type => {
      if (!dealTypeSet.has(type)) return '❌';
      // Check if this specific deal type was verified
      if (verifiedDeals.has(type)) return '✅';
      // Has the deal but not specifically verified (JS-rendered or unverified)
      if (['verified', 'meta_verified'].includes(classification)) return '☑️';
      return '⚠️';
    });

    rows.push({
      slug,
      name:     prettyName(slug),
      dealCount: chain.deal_count || deals.length,
      typeColumns,
      classification,
      classDisplay: classLabel(classification),
      warning: warning ? warning.slice(0, 80) : '',
    });
  }

  // Also include any chains in verify that don't have a chain file
  for (const [slug, vData] of Object.entries(verifyChains)) {
    if (!rows.find(r => r.slug === slug)) {
      const typeColumns = DEAL_TYPES.map(() => '❓');
      rows.push({
        slug,
        name: prettyName(slug),
        dealCount: 0,
        typeColumns,
        classification: vData.classification || 'unknown',
        classDisplay: classLabel(vData.classification),
        warning: vData.warning || '',
      });
    }
  }

  // Sort: verified first, then by name
  rows.sort((a, b) => {
    const order = ['verified', 'meta_verified', 'protected', 'slow', 'warning', '404', 'error', 'unknown'];
    const ai = order.indexOf(a.classification), bi = order.indexOf(b.classification);
    if (ai !== bi) return ai - bi;
    return a.slug.localeCompare(b.slug);
  });

  // Build the header
  const typeHeaders = DEAL_TYPES.map(t => DEAL_LABELS[t]).join(' | ');
  const typeSep     = DEAL_TYPES.map(() => '---').join(' | ');

  const tableRows = rows.map(r =>
    `| ${r.name} | ${r.typeColumns.join(' | ')} | ${r.dealCount} | ${r.classDisplay} |` +
    (r.warning ? ` *${r.warning}*` : '')
  ).join('\n');

  // Summary
  const totalDeals = rows.reduce((s, r) => s + r.dealCount, 0);
  const fullyVerified = rows.filter(r => r.classification === 'verified').length;
  const metaVerified  = rows.filter(r => r.classification === 'meta_verified').length;
  const protected_    = rows.filter(r => r.classification === 'protected').length;
  const slow          = rows.filter(r => r.classification === 'slow').length;
  const warnings      = rows.filter(r => r.classification === 'warning').length;
  const broken404     = rows.filter(r => r.classification === '404').length;

  const md = `# FreebieMe Chain Coverage Report

Generated: ${TODAY}
Verification file: deal-verification-${TODAY}.json

## Summary

| Metric | Count |
|--------|-------|
| Total chains | ${rows.length} |
| Total deal templates | ${totalDeals} |
| Fully verified | ${fullyVerified} |
| Meta-verified (JS-rendered) | ${metaVerified} |
| Bot-protected (403) | ${protected_} |
| Slow (timeout) | ${slow} |
| Content warnings | ${warnings} |
| Broken URLs (404) | ${broken404} |

## Legend

- ✅ = Deal type confirmed (keyword found in HTML or verified deal)
- ☑️ = Deal type in template; page is rewards-confirmed (meta/URL)
- ❌ = Deal type not in templates for this chain
- ⚠️ = Deal type in template but page content flags a warning
- ❓ = Unknown / no data

## Chain Coverage

| Chain | ${typeHeaders} | Deals | Verification |
|-------|${typeSep}|------|------|
${tableRows}

---
*Generated by generate-chain-coverage.js — run after verify-deals.js for accurate status*
`;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
  console.log(`Chain coverage report written to: ${OUTPUT_FILE}`);
  console.log(`  ${rows.length} chains | ${totalDeals} deal templates | ${fullyVerified} verified | ${metaVerified} meta-verified | ${warnings} warnings`);
}

try {
  main();
} catch (e) {
  console.error('generate-chain-coverage.js error:', e.message);
  process.exit(1);
}
