'use strict';

// ─── 1. FREE ITEM KEYWORD PARSER ────────────────────────────────────────────
// Parse the free_item text to extract food category tags
function tagsFromFreeItem(freeItem) {
  if (!freeItem) return [];
  const item = freeItem.toLowerCase();
  const tags = new Set();

  // Ice cream / dessert
  if (/blizzard|sundae|soft.?serve|ice.?cream|scoop|creation|frozen yogurt|gelato|sherbet/.test(item)) {
    tags.add('ice-cream'); tags.add('dessert');
  }
  if (/cookie|brownie|cake|donut|doughnut|churro|cinnabon|pastry|muffin|danish|pie/.test(item)) {
    tags.add('dessert');
  }
  if (/shake|milkshake|malt/.test(item) && !/protein/.test(item)) {
    tags.add('ice-cream'); tags.add('dessert'); tags.add('drinks');
  }

  // Burgers
  if (/burger|whopper|mcdouble|quarter.?pounder|baconator|double.?stack|triple|jumbo.?jack|smashburger|whataburger|big.?mac|patty/.test(item)) {
    tags.add('burgers');
  }

  // Chicken (but not chicken sandwich from chicken chains — handled by chain override)
  if (/nugget|tender|strip|popcorn.?chicken|chicken.?piece|drumstick|thigh|breast|fried.?chicken/.test(item)) {
    tags.add('chicken');
  }
  if (/chicken.?sandwich|crispy.?chicken|spicy.?chicken/.test(item)) {
    tags.add('chicken'); tags.add('sandwiches');
  }

  // Wings
  if (/\bwings?\b/.test(item)) {
    tags.add('wings'); tags.add('chicken');
  }

  // Pizza
  if (/pizza|pie|slice/.test(item)) {
    tags.add('pizza');
  }

  // Tacos / Mexican
  if (/taco|burrito|bowl|quesadilla|nacho|guac|salsa|enchilada|fajita/.test(item)) {
    tags.add('tacos'); tags.add('mexican');
  }

  // Breakfast
  if (/pancake|waffle|slam|breakfast|omelet|omelette|eggs?\b|hash.?brown|biscuit|gravy|sausage.?(biscuit|platter)|french.?toast/.test(item)) {
    tags.add('breakfast');
  }

  // Coffee / hot drinks
  if (/coffee|latte|cappuccino|espresso|americano|mocha|macchiato|frappuccino|cold.?brew|nitro.?brew/.test(item)) {
    tags.add('coffee'); tags.add('drinks');
  }

  // Drinks / beverages
  if (/\bdrink\b|beverage|slush|smoothie|juice|lemonade|soda|route.?44|medium.?drink|large.?drink|any.?size.?drink/.test(item)) {
    tags.add('drinks');
  }
  if (/tea\b|chai/.test(item)) {
    tags.add('coffee'); tags.add('drinks');
  }

  // Sandwiches / subs (when not dominated by chicken/burger)
  if (/\bsub\b|\bhero\b|\bhoagie\b|\bsandwich\b/.test(item) && !tags.has('burgers') && !tags.has('chicken')) {
    tags.add('sandwiches');
  }

  // Fries
  if (/\bfri(?:es?|ed\s+potato)\b/.test(item)) {
    tags.add('fries');
  }

  // Seafood
  if (/lobster|shrimp|crab|fish|salmon|tilapia|seafood|clam/.test(item)) {
    tags.add('seafood');
  }

  // Italian / pasta
  if (/pasta|breadstick|lasagna|alfredo|marinara|ravioli|soup/.test(item)) {
    tags.add('italian');
  }

  return [...tags];
}

// ─── 2. CHAIN + DEAL_TYPE PRIMARY OVERRIDES ─────────────────────────────────
// These define the primary categories for a deal based on chain + deal_type.
// 'any' matches all deal types for that chain not explicitly listed.
// Priority: specific deal_type > 'any' > free_item parsing > chain fallback
const DEAL_TYPE_OVERRIDES = {
  // DQ: Blizzards, sundaes, ice cream — chain sells burgers too but
  //     all DEALS are about the ice cream rewards program
  'dairy-queen': {
    'any': ['ice-cream', 'dessert'],
  },
  // Sonic: happy hour and drinks are the brand identity for rewards
  'sonic': {
    'happy_hour': ['drinks'],
    'app_deal': ['drinks'],
    'signup_bonus': ['drinks'],
    'birthday': ['burgers', 'fries'],
    'any': ['drinks'],
  },
  // Shake Shack: burgers only (even their rewards are burger-focused)
  'shake-shack': {
    'any': ['burgers', 'fries'],
  },
  // Denny's: Grand Slam, Moons Over My Hammy — all breakfast
  'dennys': {
    'any': ['breakfast', 'eggs', 'pancakes'],
  },
  // IHOP: pancakes and breakfast always
  'ihop': {
    'any': ['breakfast', 'pancakes', 'eggs'],
  },
  // Waffle House: waffles and breakfast always
  'waffle-house': {
    'any': ['breakfast', 'waffles', 'eggs'],
  },
  // Starbucks: always coffee/drinks
  'starbucks': {
    'any': ['coffee', 'drinks'],
  },
  // Dunkin: coffee and donuts
  'dunkin': {
    'any': ['coffee', 'drinks', 'donuts'],
  },
  // Panera: Sip Club = coffee; other deals = sandwiches/soup
  'panera': {
    'app_deal': ['coffee', 'drinks'],
    'any': ['sandwiches', 'soup', 'breakfast'],
  },
  // Baskin-Robbins: always ice cream
  'baskin-robbins': {
    'any': ['ice-cream', 'dessert'],
  },
  // Cold Stone: always ice cream
  'cold-stone-creamery': {
    'any': ['ice-cream', 'dessert'],
  },
  // Applebee's: happy hour = drinks; birthday = casual-dining; bogo = drinks
  'applebees': {
    'happy_hour': ['drinks', 'casual-dining'],
    'bogo': ['drinks'],
    'birthday': ['casual-dining'],
    'signup_bonus': ['casual-dining'],
    'any': ['casual-dining', 'burgers', 'wings'],
  },
  // Chili's: happy hour = drinks
  'chilis': {
    'happy_hour': ['drinks', 'casual-dining'],
    'birthday': ['casual-dining'],
    'signup_bonus': ['casual-dining'],
    'any': ['casual-dining', 'burgers', 'tacos'],
  },
  // Olive Garden: always Italian
  'olive-garden': {
    'any': ['italian', 'casual-dining', 'pasta'],
  },
  // Red Lobster: always seafood
  'red-lobster': {
    'any': ['seafood', 'casual-dining'],
  },
  // Wingstop: always wings
  'wingstop': {
    'any': ['wings', 'chicken', 'fries'],
  },
  // Raising Cane's: always chicken
  'raising-canes': {
    'any': ['chicken', 'fries'],
  },
  // Panda Express: always Asian/Chinese
  'panda-express': {
    'any': ['asian', 'chinese'],
  },
  // Chipotle: always Mexican
  'chipotle': {
    'any': ['mexican', 'tacos', 'burritos'],
  },
  // Taco Bell: always tacos/Mexican
  'taco-bell': {
    'any': ['tacos', 'mexican'],
  },
  // Del Taco: primarily tacos, some burgers
  'del-taco': {
    'birthday': ['tacos', 'mexican'],
    'signup_bonus': ['tacos', 'mexican'],
    'any': ['tacos', 'mexican'],
  },
  // Jack in the Box: burgers AND tacos but taco deals → tacos
  'jack-in-the-box': {
    'app_deal': ['tacos', 'burgers'],
    'any': ['burgers', 'tacos', 'fries'],
  },
  // Subway: always sandwiches
  'subway': {
    'any': ['sandwiches', 'subs'],
  },
  // Jersey Mike's: always sandwiches
  'jersey-mikes': {
    'any': ['sandwiches', 'subs'],
  },
  // Chick-fil-A: chicken sandwiches
  'chick-fil-a': {
    'any': ['chicken', 'sandwiches'],
  },
  // KFC: always chicken
  'kfc': {
    'any': ['chicken', 'fries'],
  },
  // Popeyes: always chicken
  'popeyes': {
    'any': ['chicken', 'sandwiches'],
  },
  // Pizza Hut: pizza (+ wings for wing deals)
  'pizza-hut': {
    'any': ['pizza'],
    // wing deals handled by free_item parsing
  },
  // Domino's: pizza
  'dominos': {
    'any': ['pizza'],
  },
  // Papa John's: pizza
  'papa-johns': {
    'any': ['pizza'],
  },
  // McDonald's: burgers for birthday/signup, fries for fry deals
  'mcdonalds': {
    'birthday': ['burgers'],
    'signup_bonus': ['burgers', 'fries'],
    'app_deal': ['burgers', 'fries'],
    'any': ['burgers', 'fries'],
  },
  // Burger King: always burgers
  'burger-king': {
    'any': ['burgers', 'fries'],
  },
  // Wendy's: burgers and frosties
  'wendys': {
    'birthday': ['ice-cream', 'dessert'],
    'signup_bonus': ['ice-cream', 'dessert'],
    'any': ['burgers', 'fries'],
  },
  // Whataburger: always burgers
  'whataburger': {
    'any': ['burgers', 'fries'],
  },
};

// ─── 3. CHAIN FALLBACK CATEGORIES ────────────────────────────────────────────
// Last resort: if neither override nor free_item parsing yields tags,
// use the chain's most representative category (NOT all categories)
const CHAIN_PRIMARY = {
  'mcdonalds': ['burgers'],
  'burger-king': ['burgers'],
  'wendys': ['burgers'],
  'shake-shack': ['burgers'],
  'whataburger': ['burgers'],
  'jack-in-the-box': ['burgers'],
  'del-taco': ['tacos'],
  'dairy-queen': ['ice-cream', 'dessert'],
  'sonic': ['drinks'],
  'chipotle': ['mexican', 'tacos'],
  'taco-bell': ['tacos'],
  'pizza-hut': ['pizza'],
  'dominos': ['pizza'],
  'papa-johns': ['pizza'],
  'chick-fil-a': ['chicken'],
  'kfc': ['chicken'],
  'popeyes': ['chicken'],
  'wingstop': ['wings'],
  'raising-canes': ['chicken'],
  'panda-express': ['asian'],
  'subway': ['sandwiches'],
  'jersey-mikes': ['sandwiches'],
  'panera': ['sandwiches'],
  'starbucks': ['coffee'],
  'dunkin': ['coffee'],
  'baskin-robbins': ['ice-cream'],
  'cold-stone-creamery': ['ice-cream'],
  'waffle-house': ['breakfast'],
  'ihop': ['breakfast'],
  'dennys': ['breakfast'],
  'applebees': ['casual-dining'],
  'chilis': ['casual-dining'],
  'olive-garden': ['italian'],
  'red-lobster': ['seafood'],
};

// ─── 4. MAIN TAGGING FUNCTION ────────────────────────────────────────────────
function tagDeal(deal) {
  const { chain_slug, deal_type, free_item, title, description } = deal;
  const tags = new Set();

  // Priority 1: Chain + deal_type override
  const chainOverrides = DEAL_TYPE_OVERRIDES[chain_slug];
  if (chainOverrides) {
    const specificTags = chainOverrides[deal_type] || chainOverrides['any'];
    if (specificTags) {
      specificTags.forEach(t => tags.add(t));
      // Don't fall through — the override is authoritative for this chain
      return [...tags];
    }
  }

  // Priority 2: Free item keyword parsing
  const itemTags = tagsFromFreeItem(free_item);
  if (itemTags.length > 0) {
    itemTags.forEach(t => tags.add(t));
    return [...tags];
  }

  // Priority 3: Parse title/description for food keywords (same parser)
  const titleTags = tagsFromFreeItem(title + ' ' + (description || ''));
  if (titleTags.length > 0) {
    titleTags.forEach(t => tags.add(t));
    return [...tags];
  }

  // Priority 4: Chain primary fallback
  const primary = CHAIN_PRIMARY[chain_slug] || ['other'];
  primary.forEach(t => tags.add(t));
  return [...tags];
}

module.exports = { tagDeal, DEAL_TYPE_OVERRIDES, CHAIN_PRIMARY };
