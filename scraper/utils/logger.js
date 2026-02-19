// logger.js
// Logs results and alerts on failures

const fs = require('fs');
const path = require('path');

const OUTPUT_BASE = path.join(__dirname, '../../data/output');
const LOG_PATH = path.join(OUTPUT_BASE, 'scraper-log.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function logResult(source, count, error = null) {
  ensureDir(OUTPUT_BASE);
  let log = [];

  try {
    if (fs.existsSync(LOG_PATH)) {
      log = JSON.parse(fs.readFileSync(LOG_PATH));
    }
  } catch (e) {
    log = [];
  }

  // Keep last 30 days of logs
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  log = log.filter(entry => new Date(entry.timestamp) > thirtyDaysAgo);

  const entry = {
    timestamp: new Date().toISOString(),
    source,
    count,
    error: error?.message || null
  };

  log.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  // Check for anomalies (count dropped from previous run)
  const previousEntry = log
    .filter(e => e.source === source && e.timestamp !== entry.timestamp)
    .slice(-1)[0];

  if (previousEntry && previousEntry.count > 0 && count === 0) {
    console.warn(`⚠️  ALERT: ${source} returned 0 results (was ${previousEntry.count})`);
  }
}

module.exports = { logResult };
