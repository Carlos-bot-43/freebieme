'use strict';

// Chain display names (for step text)
const CHAIN_NAMES = {
  'mcdonalds': "McDonald's", 'chipotle': 'Chipotle', 'starbucks': 'Starbucks',
  'subway': 'Subway', 'dunkin': "Dunkin'", 'chick-fil-a': 'Chick-fil-A',
  'burger-king': 'Burger King', 'wendys': "Wendy's", 'pizza-hut': 'Pizza Hut',
  'dominos': "Domino's", 'papa-johns': "Papa John's", 'kfc': 'KFC',
  'popeyes': 'Popeyes', 'sonic': 'Sonic', 'panda-express': 'Panda Express',
  'wingstop': 'Wingstop', 'jersey-mikes': "Jersey Mike's", 'raising-canes': "Raising Cane's",
  'whataburger': 'Whataburger', 'jack-in-the-box': 'Jack in the Box',
  'del-taco': 'Del Taco', 'shake-shack': 'Shake Shack', 'waffle-house': 'Waffle House',
  'ihop': 'IHOP', 'dennys': "Denny's", 'applebees': "Applebee's",
  'chilis': "Chili's", 'olive-garden': 'Olive Garden', 'red-lobster': 'Red Lobster',
  'baskin-robbins': 'Baskin-Robbins', 'cold-stone-creamery': 'Cold Stone Creamery',
  'dairy-queen': 'Dairy Queen', 'taco-bell': 'Taco Bell', 'panera': 'Panera Bread',
  'five-guys': 'Five Guys', 'tim-hortons': 'Tim Hortons', 'krispy-kreme': 'Krispy Kreme',
  'noodles-and-company': 'Noodles & Company',
};

// Happy hour structured time data
const HAPPY_HOUR_DATA = {
  'sonic':    { start: '14:00', end: '16:00', days: 'every day', note: 'App members may get half-price drinks all day long' },
  'applebees':{ start: '15:00', end: '18:00', days: 'Mon–Fri', note: 'At the bar only; times vary slightly by location' },
  'chilis':   { start: '15:00', end: '18:00', days: 'Mon–Fri', note: 'At the bar only' },
  'starbucks':{ start: '14:00', end: '18:00', days: 'select Fridays', note: 'Seasonal and varies — check the Starbucks app for current Happy Hour dates' },
};

// Claim type: how quickly can someone get this deal?
function getClaimType(deal) {
  const { deal_type, requires_signup, requires_app } = deal;
  if (deal_type === 'birthday') return 'birthday_only';
  if (deal_type === 'happy_hour') return 'instant';
  if (deal_type === 'bogo' && !requires_signup) return 'instant';
  if (deal_type === 'discount' && !requires_signup) return 'instant';
  if (deal_type === 'freebie' && !requires_signup) return 'instant';
  if (deal_type === 'signup_bonus') return 'same_day_setup';
  if (deal_type === 'app_deal') return 'same_day_setup';
  if (deal_type === 'rewards_program') return 'advance_required';
  return 'same_day_setup';
}

// Generate numbered claim steps
function getClaimSteps(deal) {
  const { chain_slug, deal_type, requires_app, free_item, coupon_code } = deal;
  const name = CHAIN_NAMES[chain_slug] || chain_slug;
  const item = free_item ? `free ${free_item}` : 'your free reward';

  if (deal_type === 'happy_hour') {
    const hh = HAPPY_HOUR_DATA[chain_slug];
    if (hh) {
      const startFmt = formatHappyHourTime(hh.start);
      const endFmt = formatHappyHourTime(hh.end);
      return [
        `Walk in to any ${name} location`,
        `Visit during happy hour: ${startFmt}–${endFmt} (${hh.days})`,
        hh.note,
        'No advance signup needed at most locations',
      ];
    }
    return [
      `Walk into any ${name} location during happy hour`,
      `Order at the bar or mention the happy hour deal`,
      'No advance signup required at most locations',
    ];
  }

  if (deal_type === 'birthday') {
    const steps = [];
    if (requires_app) {
      steps.push(`Download the ${name} app (free, 2–3 min)`);
    } else {
      steps.push(`Go to ${name}'s website`);
    }
    steps.push('Create a free account and enter your birthday');
    steps.push('Important: You must register before your birthday month begins');
    steps.push(`Visit during your birthday month — your ${item} will appear in the app`);
    return steps;
  }

  if (deal_type === 'signup_bonus') {
    const steps = [];
    if (requires_app) {
      steps.push(`Download the ${name} app (free, 2–3 min)`);
      steps.push('Create a free account');
      steps.push(`Your ${item} will appear automatically — usually within minutes`);
      steps.push('Show the reward in the app at the register');
    } else {
      steps.push(`Sign up for ${name}'s rewards program online (free, ~2 min)`);
      steps.push(`Your ${item} will be emailed to you or appear in your account`);
      steps.push('Redeem on your next visit');
    }
    if (coupon_code) steps.push(`Use code: ${coupon_code}`);
    return steps;
  }

  if (deal_type === 'app_deal') {
    const steps = [];
    if (requires_app) {
      steps.push(`Download the ${name} app (free)`);
      steps.push('Open the Deals or Offers section');
    } else {
      steps.push(`Open the ${name} website or app`);
      steps.push('Find this deal in the offers section');
    }
    steps.push('Activate or claim the deal before ordering');
    steps.push('Show your phone or scan at checkout');
    return steps;
  }

  if (deal_type === 'bogo') {
    if (coupon_code) {
      return [
        `Visit any ${name} location`,
        `Order your first item`,
        `Enter code ${coupon_code} at checkout`,
        'Get your second item free',
      ];
    }
    return [
      `Download the ${name} app or visit their website`,
      'Find the BOGO offer in the deals section',
      'Add both items to your order and apply the deal',
    ];
  }

  if (deal_type === 'rewards_program') {
    return [
      `Join ${name}'s rewards program for free`,
      'Earn points on every purchase (no minimum spend)',
      `Redeem points for ${item} once you hit the threshold`,
      'Points accumulate over time — great for regular visitors',
    ];
  }

  if (deal_type === 'discount') {
    const steps = [];
    steps.push(`Visit any ${name} location`);
    if (coupon_code) steps.push(`Show or enter code: ${coupon_code}`);
    else steps.push('Mention the deal or show this page');
    return steps;
  }

  // Fallback
  return [
    `Visit the ${name} website or app`,
    'Find this deal in the rewards or offers section',
    'Follow the on-screen instructions to claim',
  ];
}

// Format happy hour times as human-readable 12-hour
function formatHappyHourTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2,'0')} ${period}`;
}

// Convert "14:00" → "2 PM", "08:00" → "8 AM"
function formatHHTime(t) {
  const [h] = t.split(':').map(Number);
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

// Chain-specific rewards program value summaries
const REWARDS_VALUE = {
  'mcdonalds': 'Points toward free food',
  'chipotle': 'Points toward free entrée',
  'starbucks': 'Stars toward free drinks',
  'subway': 'Tokens toward free subs',
  'dunkin': 'Points toward free drinks',
  'chick-fil-a': 'Points toward free food',
  'burger-king': 'Crowns toward free food',
  'wendys': 'Points toward free food',
  'pizza-hut': 'Points toward free pizza',
  'dominos': 'Free pizza every 60 points',
  'papa-johns': 'Points toward free pizza',
  'kfc': 'Points toward free chicken',
  'popeyes': 'Points toward free food',
  'sonic': 'Points toward free drinks',
  'panda-express': 'Points toward free plate',
  'wingstop': 'Points toward free wings',
  'jersey-mikes': 'Points toward free sub',
  'raising-canes': "Points toward free Cane's Sauce",
  'applebees': 'Points toward free food',
  'chilis': 'Points toward free food',
  'olive-garden': 'Points toward free food',
  'red-lobster': 'Points toward free seafood',
  'baskin-robbins': 'Points toward free scoops',
  'cold-stone-creamery': 'Points toward free Creation',
  'dairy-queen': 'Points toward free Blizzard',
  'ihop': 'Points toward free pancakes',
  'dennys': 'Points toward free food',
  'panera': 'Points toward free food',
  'taco-bell': 'Points toward free food',
  'jack-in-the-box': 'Points toward free food',
  'del-taco': 'Points toward free food',
  'shake-shack': 'Points toward free food',
  'whataburger': 'Points toward free food',
  'waffle-house': 'Points toward free food',
};

function getValueSummary(deal) {
  const { chain_slug, deal_type, free_item, discount_percent, discount_amount, title } = deal;

  // If there's a specific free item, that IS the value summary
  // Strip leading "free" to avoid "Free Free Whopper" when free_item already says "Free X"
  if (free_item) {
    const cleaned = free_item.replace(/^free\s+/i, '');
    return `Free ${cleaned}`;
  }

  // Deal-type specific summaries
  if (deal_type === 'happy_hour') {
    const hh = HAPPY_HOUR_DATA[chain_slug];
    if (hh) return `Half-price deals ${formatHHTime(hh.start)}–${formatHHTime(hh.end)} ${hh.days}`;
    return 'Half-price food & drinks';
  }

  if (deal_type === 'bogo') {
    if (/\$[\d.]+/.test(title)) return title.match(/\$[\d.]+ .{5,30}/)?.[0] || 'Buy one get one free';
    return 'Buy one, get one free';
  }

  if (deal_type === 'discount') {
    if (discount_percent) return `${discount_percent}% off`;
    if (discount_amount) return `$${discount_amount} off`;
    const priceMatch = title.match(/\$[\d.]+ .{3,25}/);
    if (priceMatch) return priceMatch[0];
    return 'Special discount';
  }

  if (deal_type === 'app_deal') {
    const match = title.match(/\$[\d.]+ .{3,30}/);
    if (match) return match[0];
    if (title.toLowerCase().includes('bogo') || title.toLowerCase().includes('buy one')) return 'BOGO deal';
    if (title.toLowerCase().includes('half')) return 'Half price';
    return 'Exclusive app deal';
  }

  if (deal_type === 'rewards_program') {
    return REWARDS_VALUE[chain_slug] || 'Earn points on every visit';
  }

  if (deal_type === 'freebie') {
    return 'Free item — check details';
  }

  if (deal_type === 'birthday') {
    return 'Free food on your birthday';
  }

  if (deal_type === 'signup_bonus') {
    return 'Free item when you sign up';
  }

  return 'See deal details';
}

module.exports = { getClaimType, getClaimSteps, getValueSummary, HAPPY_HOUR_DATA, CHAIN_NAMES, formatHappyHourTime };
