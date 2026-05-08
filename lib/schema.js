// Normalized data schema (single source of truth, shared between scraper + frontend).
//
// Replaces the legacy "deal × location × city" JSON sprawl with four separated entities:
//   - chains      (~38 rows)
//   - deals       (~50–150 rows: chain × deal_type, the unique offers)
//   - locations   (chain × city, joined later)
//   - offers      (time-bounded LTOs — empty until volatile sources land)
//
// Field conventions:
//   - All timestamps are ISO-8601 strings (UTC).
//   - All IDs are stable: <chain_slug>__<deal_type> for deals, <chain_slug>__<city_slug>__<idx> for locations.
//   - Confidence is a 0..1 float; verification_method tells you where it came from.

/** @typedef {'baseline'|'http'|'content'|'meta'|'reddit'|'slickdeals'|'newsletter'|'user-reported'} VerificationMethod */
/** @typedef {'once'|'weekly'|'annual'|'ongoing'} Recurrence */
/** @typedef {'instant'|'same_day_setup'|'advance_required'|'birthday_only'} ClaimType */

/**
 * @typedef {Object} Chain
 * @property {string} slug
 * @property {string} name
 * @property {string} rewards_url
 * @property {string[]} cuisine
 * @property {string[]} food_categories
 */

/**
 * @typedef {Object} NormalizedDeal
 * @property {string} deal_id              - <chain>__<deal_type>
 * @property {string} chain_slug
 * @property {string} deal_type
 * @property {string} title
 * @property {string} description
 * @property {string|null} free_item
 * @property {number|null} discount_percent
 * @property {number|null} discount_amount
 * @property {string|null} coupon_code
 * @property {boolean} requires_app
 * @property {boolean} requires_signup
 * @property {boolean} requires_purchase
 * @property {string} source_url
 * @property {string} source_type          - baseline | scraper | reddit | slickdeals | newsletter
 * @property {Recurrence} recurrence
 * @property {string|null} valid_from      - ISO date or null for ongoing
 * @property {string|null} valid_until     - ISO date or null for ongoing
 * @property {number} confidence_score     - 0..1
 * @property {VerificationMethod} verification_method
 * @property {string} last_verified_at     - ISO timestamp
 * @property {string} first_seen_at        - ISO timestamp
 * @property {ClaimType} claim_type
 * @property {string[]} claim_steps
 * @property {string} value_summary
 * @property {string[]} food_tags
 * @property {string} [happy_hour_start]
 * @property {string} [happy_hour_end]
 * @property {string} [happy_hour_days]
 * @property {string} [happy_hour_note]
 */

/**
 * @typedef {Object} NormalizedLocation
 * @property {string} location_id          - <chain>__<city>__<idx>
 * @property {string} chain_slug
 * @property {string} city_slug
 * @property {string|null} address
 * @property {number} lat
 * @property {number} lng
 * @property {string|null} phone
 * @property {string|null} opening_hours
 */

/**
 * @typedef {Object} NormalizedDB
 * @property {string} schema_version
 * @property {string} generated_at
 * @property {Chain[]} chains
 * @property {NormalizedDeal[]} deals
 * @property {NormalizedLocation[]} locations
 * @property {Object[]} offers          - reserved for time-bounded LTOs
 */

const SCHEMA_VERSION = '1.0.0';

// Confidence bucket helper — keeps UI logic in one place.
function confidenceBucket(score) {
  if (score >= 0.9) return 'verified';
  if (score >= 0.7) return 'likely';
  return 'unverified';
}

// Days-since helper used by the freshness badge.
function daysSince(isoTimestamp) {
  if (!isoTimestamp) return null;
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// Validate a normalized deal — returns array of error strings (empty = valid).
function validateDeal(d) {
  const errs = [];
  if (!d.deal_id) errs.push('missing deal_id');
  if (!d.chain_slug) errs.push('missing chain_slug');
  if (!d.deal_type) errs.push('missing deal_type');
  if (typeof d.confidence_score !== 'number' || d.confidence_score < 0 || d.confidence_score > 1) {
    errs.push(`confidence_score out of range: ${d.confidence_score}`);
  }
  if (!d.last_verified_at) errs.push('missing last_verified_at');
  if (!['once', 'weekly', 'annual', 'ongoing'].includes(d.recurrence)) {
    errs.push(`invalid recurrence: ${d.recurrence}`);
  }
  return errs;
}

module.exports = {
  SCHEMA_VERSION,
  confidenceBucket,
  daysSince,
  validateDeal,
};
