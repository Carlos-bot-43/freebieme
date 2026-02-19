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

module.exports = { getClaimType, getClaimSteps, HAPPY_HOUR_DATA, CHAIN_NAMES, formatHappyHourTime };
