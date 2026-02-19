// fix-sparse-cities.js — Add missing chains to sparse cities using Overpass API
// Run: node fix-sparse-cities.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_BASE = path.join(__dirname, 'data/output/deals');

const chains = require('./data/chains.json');
const cities = require('./data/cities.json');

// Cities to fix and what chains they're missing
const SPARSE_CITIES = ['fresno-ca', 'new-orleans-la'];

const CHAIN_REWARDS_URLS = {
  'mcdonalds': 'https://www.mcdonalds.com/us/en-us/mymcdonalds-rewards.html',
  'chipotle': 'https://www.chipotle.com/rewards',
  'starbucks': 'https://www.starbucks.com/rewards',
  'subway': 'https://www.subway.com/en-US/Rewards',
  'dunkin': 'https://www.dunkindonuts.com/en/dd-perks',
  'chick-fil-a': 'https://www.chick-fil-a.com/one',
  'burger-king': 'https://www.bk.com/rewards',
  'wendys': 'https://www.wendys.com/en-us/rewards',
  'pizza-hut': 'https://www.pizzahut.com/hut-rewards',
  'dominos': 'https://www.dominos.com/en/pages/content/locator/rewards.html',
  'papa-johns': 'https://www.papajohns.com/order/papa-rewards',
  'kfc': 'https://www.kfc.com/rewards',
  'popeyes': 'https://www.popeyes.com/rewards',
  'sonic': 'https://www.sonicdrivein.com/app',
  'panda-express': 'https://www.pandaexpress.com/rewards',
  'wingstop': 'https://www.wingstop.com/order/club',
  'jersey-mikes': 'https://www.jerseymikes.com/mikes-way-rewards',
  'raising-canes': 'https://www.raisingcanes.com/caniac-club',
  'whataburger': 'https://www.whataburger.com/rewards',
  'jack-in-the-box': 'https://www.jackinthebox.com/jack-pack',
  'del-taco': 'https://www.deltaco.com/dels-rewards',
  'shake-shack': 'https://www.shakeshack.com/app/',
  'waffle-house': 'https://www.wafflehouse.com/regulars-app/',
  'ihop': 'https://www.ihop.com/en/rewards',
  'dennys': 'https://www.dennys.com/rewards',
  'applebees': 'https://www.applebees.com/en/rewards',
  'chilis': 'https://www.chilis.com/rewards',
  'olive-garden': 'https://www.olivegarden.com/rewards',
  'red-lobster': 'https://www.redlobster.com/rewards',
  'baskin-robbins': 'https://www.baskinrobbins.com/content/baskinrobbins/en/rewards.html',
  'cold-stone-creamery': 'https://www.coldstonecreamery.com/my-cold-stone-club',
  'dairy-queen': 'https://www.dairyqueen.com/en-us/rewards/',
  'taco-bell': 'https://www.tacobell.com/rewards',
  'panera': 'https://www.panerabread.com/en-us/mypanera-rewards.html',
};

// Deals templates per chain - primary deal type
const CHAIN_PRIMARY_DEALS = {
  'mcdonalds': {
    deal_type: 'app_deal',
    title: 'Weekly app deals & free fries',
    description: "Download the McDonald's app for weekly BOGO deals, free medium fries with any $1+ purchase, and exclusive app-only prices.",
    free_item: 'Medium fries',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: true,
  },
  'chipotle': {
    deal_type: 'birthday',
    title: 'Free entrée on your birthday',
    description: 'Join Chipotle Rewards and get a free entrée (bowl, burrito, or salad) during your birthday month.',
    free_item: 'Free entrée',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.9, is_recurring: true,
  },
  'starbucks': {
    deal_type: 'birthday',
    title: 'Free birthday drink or food item',
    description: 'Join Starbucks Rewards and get a free drink or food item on your birthday.',
    free_item: 'Free drink or food',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.98, is_recurring: true,
  },
  'subway': {
    deal_type: 'rewards_program',
    title: 'Earn free subs with Subway MVP Rewards',
    description: 'Subway MVP Rewards members earn tokens on every order, redeemable for free footlong subs and other menu items.',
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.9, is_recurring: true,
  },
  'dunkin': {
    deal_type: 'rewards_program',
    title: 'Earn free drinks with Dunkin\' Rewards',
    description: "Dunkin' Rewards members earn points on every purchase, redeemable for free coffee, donuts, and more.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.9, is_recurring: true,
  },
  'chick-fil-a': {
    deal_type: 'birthday',
    title: 'Free birthday treat',
    description: 'Join Chick-fil-A One and earn a free birthday treat — food or dessert — during your birthday month.',
    free_item: 'Birthday treat',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.9, is_recurring: true,
  },
  'burger-king': {
    deal_type: 'signup_bonus',
    title: 'Free Whopper when you join',
    description: 'Join Royal Perks and get a free Whopper on your next order through the BK app.',
    free_item: 'Whopper',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.9, is_recurring: false,
  },
  'wendys': {
    deal_type: 'signup_bonus',
    title: 'Free Jr. Frosty when you join',
    description: "Join Wendy's Rewards and get a free Jr. Frosty with your next purchase.",
    free_item: 'Jr. Frosty',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.8, is_recurring: false,
  },
  'pizza-hut': {
    deal_type: 'rewards_program',
    title: 'Earn free pizza with Hut Rewards',
    description: "Hut Rewards members earn points on every order, redeemable for free pizzas and sides.",
    free_item: null,
    discount_percent: null,
    requires_app: false, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: true,
  },
  'dominos': {
    deal_type: 'rewards_program',
    title: 'Free pizza every 60 points',
    description: "Domino's Rewards: earn 10 points per $10 spent. 60 points = free medium 2-topping pizza.",
    free_item: null,
    discount_percent: null,
    requires_app: false, requires_signup: true, requires_purchase: false,
    confidence_score: 1.0, is_recurring: true,
  },
  'kfc': {
    deal_type: 'birthday',
    title: 'Free birthday treat with KFC Rewards',
    description: 'Join KFC Rewards and earn a free birthday treat during your birthday month.',
    free_item: 'Birthday treat',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.8, is_recurring: true,
  },
  'popeyes': {
    deal_type: 'signup_bonus',
    title: 'Free chicken sandwich when you join',
    description: 'Join Popeyes Rewards via the app and get a free Classic Chicken Sandwich on your first visit.',
    free_item: 'Classic Chicken Sandwich',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: false,
  },
  'taco-bell': {
    deal_type: 'rewards_program',
    title: 'Earn free tacos with Taco Bell Rewards',
    description: 'Taco Bell Rewards members earn points on every order, redeemable for free tacos, burritos, and more.',
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.9, is_recurring: true,
  },
  'sonic': {
    deal_type: 'app_deal',
    title: 'Half-price drinks all day on the app',
    description: "Sonic app members can get half-price drinks and slushes all day long — not just during Happy Hour.",
    free_item: null,
    discount_percent: 50,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.9, is_recurring: true,
  },
  'panda-express': {
    deal_type: 'rewards_program',
    title: 'Earn free Panda with Panda Rewards',
    description: "Panda Rewards members earn points on every order, redeemable for free entrees and sides.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: true,
  },
  'raising-canes': {
    deal_type: 'rewards_program',
    title: 'Earn free Cane\'s with Caniac Club',
    description: "Caniac Club members earn points on every order, redeemable for free chicken fingers and combos.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: true,
  },
  'shake-shack': {
    deal_type: 'signup_bonus',
    title: 'Free ShackBurger when you join',
    description: "Join Shack Track via the app and get a free ShackBurger on your first order.",
    free_item: 'ShackBurger',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: false,
  },
  'dairy-queen': {
    deal_type: 'birthday',
    title: 'Free Blizzard on your birthday',
    description: 'Join DQ Rewards and get a free Blizzard Treat during your birthday month.',
    free_item: 'Free Blizzard',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.9, is_recurring: true,
  },
  'baskin-robbins': {
    deal_type: 'birthday',
    title: 'Free birthday scoop',
    description: 'Join Baskin-Robbins Birthday Club and get a free birthday scoop on your birthday.',
    free_item: 'Birthday scoop',
    discount_percent: null,
    requires_app: false, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: true,
  },
  'jack-in-the-box': {
    deal_type: 'signup_bonus',
    title: 'Free Jumbo Jack when you join',
    description: "Sign up for Jack Pack Rewards and get a free Jumbo Jack on your next app order.",
    free_item: 'Jumbo Jack',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.75, is_recurring: false,
  },
  'wingstop': {
    deal_type: 'rewards_program',
    title: 'Earn free wings with Wingstop Club',
    description: "Wingstop Club members earn points on every order, redeemable for free wings and more.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: true,
  },
  'panera': {
    deal_type: 'rewards_program',
    title: 'Earn free pastries with MyPanera',
    description: "MyPanera Rewards members earn points on every visit, redeemable for free pastries, soups, and more.",
    free_item: null,
    discount_percent: null,
    requires_app: false, requires_signup: true, requires_purchase: true,
    confidence_score: 0.9, is_recurring: true,
  },
  'ihop': {
    deal_type: 'signup_bonus',
    title: 'Free short stack when you join',
    description: 'Join IHOP International Bank of Pancakes (MyHop) and get a free short stack of pancakes.',
    free_item: 'Short stack pancakes',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: false,
  },
  'dennys': {
    deal_type: 'signup_bonus',
    title: 'Free Grand Slam when you join',
    description: "Join Denny's Rewards and get a free Original Grand Slam on your next visit.",
    free_item: 'Original Grand Slam',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: false,
    confidence_score: 0.85, is_recurring: false,
  },
  'applebees': {
    deal_type: 'app_deal',
    title: 'App deal — $5 off $25 purchase',
    description: "Get $5 off a $25 purchase with the Applebee's app.",
    free_item: null,
    discount_percent: null,
    discount_amount: 5,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.8, is_recurring: true,
  },
  'chilis': {
    deal_type: 'freebie',
    title: 'Free chips & salsa or non-alcoholic beverage',
    description: "Join My Chili's Rewards and get free chips & salsa or a non-alcoholic beverage on every visit.",
    free_item: 'chips & salsa or beverage',
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.95, is_recurring: true,
  },
  'olive-garden': {
    deal_type: 'signup_bonus',
    title: 'Free appetizer when you join',
    description: "Sign up for Olive Garden's eClub and receive a coupon for a free appetizer or dessert.",
    free_item: 'Appetizer or dessert',
    discount_percent: null,
    requires_app: false, requires_signup: true, requires_purchase: false,
    confidence_score: 0.8, is_recurring: false,
  },
  'red-lobster': {
    deal_type: 'rewards_program',
    title: 'Earn toward free lobster',
    description: "My Red Lobster Rewards: earn points on every visit, redeemable for free menu items including lobster dishes.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: true,
  },
  'cold-stone-creamery': {
    deal_type: 'rewards_program',
    title: 'Earn free Creations with Cold Stone Club',
    description: "My Cold Stone Club members earn points on every purchase, redeemable for free ice cream Creations.",
    free_item: null,
    discount_percent: null,
    requires_app: true, requires_signup: true, requires_purchase: true,
    confidence_score: 0.85, is_recurring: true,
  },
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildQuery(cityConfig, variants) {
  const { min_lat, max_lat, min_lng, max_lng } = cityConfig.bbox;
  const bbox = `${min_lat},${min_lng},${max_lat},${max_lng}`;
  const nodeFilters = variants.map(n => `node["name"="${n}"](${bbox});`).join('\n  ');
  const wayFilters = variants.map(n => `way["name"="${n}"](${bbox});`).join('\n  ');
  return `[out:json][timeout:45];\n(\n  ${nodeFilters}\n  ${wayFilters}\n);\nout center;`;
}

function matchChainSlug(osmName) {
  if (!osmName) return null;
  for (const chain of chains) {
    const normalized = osmName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const variant of chain.osm_name_variants) {
      if (normalized === variant.toLowerCase().replace(/[^a-z0-9]/g, '')) {
        return chain.slug;
      }
    }
  }
  return null;
}

async function fetchChainLocations(cityConfig, missingChainSlugs) {
  const targetChains = chains.filter(c => missingChainSlugs.includes(c.slug));
  const allVariants = targetChains.flatMap(c => c.osm_name_variants);
  
  // Split into batches of 8 variants
  const BATCH_SIZE = 8;
  const allElements = [];
  
  for (let i = 0; i < allVariants.length; i += BATCH_SIZE) {
    const batch = allVariants.slice(i, i + BATCH_SIZE);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const query = buildQuery(cityConfig, batch);
        const res = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 50000
        });
        allElements.push(...(res.data.elements || []));
        await sleep(1000);
        break;
      } catch (err) {
        console.error(`  Batch ${Math.floor(i/BATCH_SIZE)+1} attempt ${attempt+1} failed: ${err.message}`);
        if (attempt < 2) await sleep(3000);
      }
    }
  }
  
  return allElements
    .filter(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      return lat && lon && el.tags?.name;
    })
    .map(el => {
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      const chainSlug = matchChainSlug(el.tags.name);
      if (!chainSlug) return null;
      return {
        chainSlug,
        osmId: el.id,
        lat, lng: lon,
        address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' ') || null,
        city: el.tags['addr:city'] || cityConfig.name,
        state: el.tags['addr:state'] || null,
        zip: el.tags['addr:postcode'] || null,
        phone: null,
        opening_hours: null,
        location_name: el.tags.name,
      };
    })
    .filter(Boolean);
}

function createDeal(location, template, sourceUrl) {
  return {
    deal_id: `${location.chainSlug}_${template.deal_type}_${location.osmId}`,
    title: template.title,
    description: template.description,
    deal_type: template.deal_type,
    free_item: template.free_item || null,
    discount_percent: template.discount_percent || null,
    discount_amount: template.discount_amount || null,
    requires_app: template.requires_app,
    requires_signup: template.requires_signup,
    requires_purchase: template.requires_purchase,
    coupon_code: null,
    confidence_score: template.confidence_score,
    source_url: sourceUrl,
    is_recurring: template.is_recurring,
    chain_slug: location.chainSlug,
    location_name: location.location_name,
    address: location.address,
    city: location.city,
    state: location.state,
    zip: location.zip,
    lat: location.lat,
    lng: location.lng,
    phone: null,
    opening_hours: null,
  };
}

(async () => {
  for (const citySlug of SPARSE_CITIES) {
    const cityConfig = cities.find(c => c.slug === citySlug);
    if (!cityConfig) { console.log(`City not found: ${citySlug}`); continue; }

    const filePath = path.join(OUTPUT_BASE, `${citySlug}.json`);
    if (!fs.existsSync(filePath)) { console.log(`File not found: ${citySlug}.json`); continue; }
    
    const data = JSON.parse(fs.readFileSync(filePath));
    const existingChains = new Set(data.deals.map(d => d.chain_slug));
    const missingChains = Object.keys(CHAIN_PRIMARY_DEALS).filter(c => !existingChains.has(c));
    
    console.log(`\n${citySlug}: has ${existingChains.size} chains, missing ${missingChains.length}: ${missingChains.join(', ')}`);
    
    if (missingChains.length === 0) { console.log('  Nothing to do'); continue; }
    
    console.log(`  Fetching OSM data...`);
    const locations = await fetchChainLocations(cityConfig, missingChains);
    
    console.log(`  Found ${locations.length} locations`);
    
    const newDeals = [];
    for (const loc of locations) {
      const template = CHAIN_PRIMARY_DEALS[loc.chainSlug];
      const sourceUrl = CHAIN_REWARDS_URLS[loc.chainSlug] || '';
      if (!template) continue;
      newDeals.push(createDeal(loc, template, sourceUrl));
    }
    
    console.log(`  Generated ${newDeals.length} new deals`);
    
    if (newDeals.length > 0) {
      data.deals = [...data.deals, ...newDeals];
      data.deal_count = data.deals.length;
      fs.writeFileSync(filePath, JSON.stringify(data));
      const finalChains = new Set(data.deals.map(d => d.chain_slug));
      console.log(`  ${citySlug}: now ${data.deals.length} deals, ${finalChains.size} chains`);
    }
  }
  
  console.log('\nDone!');
})();
