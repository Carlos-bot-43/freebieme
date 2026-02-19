// confidence.js
// Scores how reliable a deal is (0.0 = noise, 1.0 = verified)

function scoreConfidence(parsedDeal, extractionMethod) {
  let score = 0.5; // Start neutral

  // Extraction method bonus
  if (extractionMethod === 'selector') score += 0.1;  // Structured extraction better
  if (extractionMethod === 'keyword') score -= 0.05;  // Keyword match less reliable

  // Deal type bonuses
  if (parsedDeal.deal_type === 'birthday') score += 0.2;       // Birthday deals are reliable
  if (parsedDeal.deal_type === 'signup_bonus') score += 0.15;  // Signup deals are consistent
  if (parsedDeal.deal_type === 'other') score -= 0.3;          // Unknown type = low confidence

  // Specificity bonuses
  if (parsedDeal.free_item) score += 0.15;            // Mentions specific item
  if (parsedDeal.discount_percent) score += 0.1;      // Specific percentage
  if (parsedDeal.discount_amount) score += 0.1;       // Specific dollar amount

  // Red flags (reduce score)
  const desc = parsedDeal.description.toLowerCase();
  if (/subscription|membership fee|\$\d+\/month/i.test(desc)) score -= 0.3; // Paid subscription
  if (/while supplies last|limited quantities/i.test(desc)) score -= 0.1;
  if (/see details|terms apply|restrictions apply/i.test(desc)) score -= 0.05;
  if (parsedDeal.description.length < 20) score -= 0.2; // Too short, likely noise
  if (/earn \d+ points? (per|for)/i.test(desc) && !/free/i.test(desc)) score -= 0.2; // Points only, no free item

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, score));
}

module.exports = { scoreConfidence };
