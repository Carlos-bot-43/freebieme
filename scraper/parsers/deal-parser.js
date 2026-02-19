// deal-parser.js
// Converts raw text strings into structured deal objects

function parseDeal(text, chainSlug) {
  if (!text || text.length < 10) return null;

  const lower = text.toLowerCase();

  // Skip obvious noise
  const noisePatterns = [
    /^sign in/i, /^log in/i, /^download the app$/i,
    /^learn more$/i, /^click here$/i, /^terms and conditions/i,
    /^privacy policy/i, /copyright/i, /all rights reserved/i,
    /^\d+$/, /^[^a-zA-Z]*$/  // Numbers only or no letters
  ];
  if (noisePatterns.some(p => p.test(text.trim()))) return null;

  // Detect deal type
  let dealType = 'other';
  if (/birthday/i.test(lower)) dealType = 'birthday';
  else if (/sign.?up|join|register|new member/i.test(lower) && /free|bonus/i.test(lower)) dealType = 'signup_bonus';
  else if (/app.only|app deal|app exclusive/i.test(lower)) dealType = 'app_deal';
  else if (/bogo|buy one get one/i.test(lower)) dealType = 'bogo';
  else if (/happy hour/i.test(lower)) dealType = 'happy_hour';
  else if (/earn|point|reward/i.test(lower) && !/free/i.test(lower)) dealType = 'rewards_program';
  else if (/free/i.test(lower)) dealType = 'freebie';
  else if (/\d+%\s*off|\$\d+\s*off/i.test(lower)) dealType = 'discount';

  // Skip rewards program descriptions (too vague)
  if (dealType === 'other' && !/free|off|\$|bogo|birthday|bonus/i.test(lower)) return null;

  // Extract free item
  const freeItemMatch = text.match(/free\s+([\w\s]{3,30}?)(?:\s+on|\s+with|\s+when|\s+during|\.|,|$)/i);
  const freeItem = freeItemMatch ? freeItemMatch[1].trim() : null;

  // Extract discount
  const percentMatch = text.match(/(\d+)\s*%\s*off/i);
  const dollarOffMatch = text.match(/\$(\d+(?:\.\d{2})?)\s*off/i);

  // Extract requirements
  const requiresApp = /app|download|mobile/i.test(lower);
  const requiresSignup = /sign.?up|join|member|rewards|register/i.test(lower);
  const requiresPurchase = /with\s+(any\s+)?purchase|min(?:imum)?\s+\$\d+/i.test(lower);

  const minPurchaseMatch = text.match(/min(?:imum)?\s+\$?(\d+(?:\.\d{2})?)/i) ||
                           text.match(/with\s+(?:any\s+)?\$(\d+(?:\.\d{2})?)\s+purchase/i);

  // Extract expiry hints
  const expiryHints = [];
  if (/birthday month/i.test(lower)) expiryHints.push('birthday_month');
  if (/expires?|ends?|through|until/i.test(lower)) {
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
    if (dateMatch) expiryHints.push(dateMatch[1]);
  }

  return {
    title: text.length > 100 ? text.substring(0, 97) + '...' : text,
    description: text,
    deal_type: dealType,
    free_item: freeItem,
    discount_percent: percentMatch ? parseInt(percentMatch[1]) : null,
    discount_amount: dollarOffMatch ? parseFloat(dollarOffMatch[1]) : null,
    min_purchase: minPurchaseMatch ? parseFloat(minPurchaseMatch[1]) : null,
    requires_app: requiresApp,
    requires_signup: requiresSignup,
    requires_purchase: requiresPurchase,
    expiry_hints: expiryHints,
    is_recurring: !/expires?|ends?|limited time|today only/i.test(lower)
  };
}

module.exports = { parseDeal };
