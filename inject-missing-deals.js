// inject-missing-deals.js — Add missing deal types per chain across all city files
// Run: node inject-missing-deals.js

const fs = require('fs');
const path = require('path');
const { tagDeal } = require('./lib/tag-deals');
const { getClaimType, getClaimSteps, HAPPY_HOUR_DATA } = require('./lib/claim-steps');

const INPUT_DIR = path.join(__dirname, 'data/output/deals');
const OUTPUT_DIR = path.join(__dirname, 'data/output/deals'); // update in place

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

// Chain -> array of deal templates to inject (if missing)
// Each template: { deal_type, title, description, free_item, discount_percent, discount_amount,
//   requires_app, requires_signup, requires_purchase, confidence_score, coupon_code }
const CHAIN_DEAL_TEMPLATES = {
  'mcdonalds': [
    {
      deal_type: 'birthday',
      title: 'Free McDouble on your birthday',
      description: "Join MyMcDonald's Rewards and get a free McDouble during your birthday month. Must be registered 7 days before your birthday.",
      free_item: 'McDouble',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free Medium Fries when you join',
      description: "Sign up for MyMcDonald's Rewards and get free Medium Fries on your first app order.",
      free_item: 'Medium fries',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'chipotle': [
    {
      deal_type: 'signup_bonus',
      title: 'Free chips & guac when you join',
      description: 'Join Chipotle Rewards via the app and get free chips & guacamole on your next order.',
      free_item: 'Chips & guacamole',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'app_deal',
      title: 'Extra points & exclusive app deals',
      description: 'Order through the Chipotle app for bonus points, exclusive offers, and early access to new menu items.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'starbucks': [
    {
      deal_type: 'signup_bonus',
      title: '25 Bonus Stars when you join',
      description: 'Join Starbucks Rewards and earn 25 Bonus Stars on your first purchase. Stars add up to free drinks and food.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.9,
    },
    {
      deal_type: 'app_deal',
      title: 'Double stars & bonus rewards',
      description: 'Starbucks Rewards members earn double stars on select days and get exclusive app-only bonus rewards.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.9,
    },
    {
      deal_type: 'happy_hour',
      title: 'Happy Hour — 50% off drinks',
      description: 'Starbucks Happy Hour offers 50% off select drinks, usually on Friday afternoons. Check the app for current dates.',
      free_item: null,
      discount_percent: 50,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'burger-king': [
    {
      deal_type: 'birthday',
      title: 'Free Whopper Jr. on your birthday',
      description: 'Join Royal Perks and get a free Whopper Jr. during your birthday month. Download the BK app to claim.',
      free_item: 'Whopper Jr.',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'app_deal',
      title: 'BOGO Whopper on the app',
      description: 'Get a free Whopper when you buy one through the Burger King app. App-exclusive BOGO deal.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.85,
    },
  ],
  'chick-fil-a': [
    {
      deal_type: 'signup_bonus',
      title: 'Free sandwich when you join',
      description: 'Join Chick-fil-A One and get a free Chicken Sandwich on your first app order.',
      free_item: 'Chicken sandwich',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'rewards_program',
      title: 'Earn points on every visit',
      description: 'Chick-fil-A One members earn points on every order, redeemable for free menu items. Higher tiers unlock better rewards.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.9,
    },
  ],
  'sonic': [
    {
      deal_type: 'happy_hour',
      title: 'Happy Hour — half-price drinks & slushes 2-4pm daily',
      description: 'Sonic Happy Hour runs 2-4pm daily with half-price drinks and slushes. App members may get extended happy hour all day.',
      free_item: null,
      discount_percent: 50,
      requires_app: false, requires_signup: false, requires_purchase: true,
      confidence_score: 0.95,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free Route 44 drink when you join',
      description: 'Sign up for the Sonic app and get a free Route 44 drink on your first app order.',
      free_item: 'Route 44 drink',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
  ],
  'subway': [
    {
      deal_type: 'signup_bonus',
      title: 'Free cookie when you sign up',
      description: 'Join Subway MVP Rewards and get a free cookie on your next visit.',
      free_item: 'Cookie',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: 'BOGO footlong Mondays',
      description: 'Get a free footlong sub when you buy one every Monday through the Subway app.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.8,
    },
  ],
  'kfc': [
    {
      deal_type: 'signup_bonus',
      title: 'Free chicken sandwich when you join',
      description: 'Join KFC Rewards and get a free Classic Chicken Sandwich on your next order.',
      free_item: 'Chicken sandwich',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'rewards_program',
      title: 'Earn free chicken with KFC Rewards',
      description: 'KFC Rewards members earn points on every order, redeemable for free chicken, sides, and more.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.85,
    },
  ],
  'dunkin': [
    {
      deal_type: 'signup_bonus',
      title: 'Free medium drink when you join',
      description: 'Join Dunkin\' Rewards and get a free medium drink on your first app order.',
      free_item: 'Medium drink',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'app_deal',
      title: '$3 medium lattes on the app',
      description: 'Get $3 medium lattes and other exclusive deals through the Dunkin\' app every week.',
      free_item: null,
      discount_amount: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'taco-bell': [
    {
      deal_type: 'birthday',
      title: '4 free Cinnabon Delights on your birthday',
      description: 'Join Taco Bell Rewards and get 4 free Cinnabon Delights during your birthday month.',
      free_item: '4 Cinnabon Delights',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.9,
    },
    {
      deal_type: 'app_deal',
      title: '$2 burritos & exclusive app deals',
      description: 'Get $2 burritos and other exclusive deals through the Taco Bell app every week.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'wendys': [
    {
      deal_type: 'birthday',
      title: 'Free Jr. Frosty on your birthday',
      description: 'Join Wendy\'s Rewards and get a free Jr. Frosty during your birthday month.',
      free_item: 'Jr. Frosty',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: 'Daily Wendy\'s app deals',
      description: 'Get daily exclusive offers through the Wendy\'s app, including BOGOs, free items, and discounts.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'pizza-hut': [
    {
      deal_type: 'birthday',
      title: 'Free personal pan pizza on your birthday',
      description: 'Join Hut Rewards and get a free Personal Pan Pizza during your birthday month.',
      free_item: 'Personal pan pizza',
      requires_app: false, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: '$10.99 large pizzas on the app',
      description: 'Order through the Pizza Hut app for $10.99 large 3-topping pizzas and other exclusive deals.',
      free_item: null,
      requires_app: true, requires_signup: false, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'dominos': [
    {
      deal_type: 'signup_bonus',
      title: 'Free medium pizza on your first order',
      description: 'Join Domino\'s Rewards and get a free Medium 2-Topping Pizza on your first online order.',
      free_item: 'Medium 2-topping pizza',
      requires_app: false, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: 'Mix & Match — 2 for $6.99 each',
      description: 'Order 2 or more qualifying items for $6.99 each through the Domino\'s app or website.',
      free_item: null,
      requires_app: true, requires_signup: false, requires_purchase: false,
      confidence_score: 0.9,
    },
  ],
  'applebees': [
    {
      deal_type: 'happy_hour',
      title: 'Half-price appetizers & $1-5 drinks Mon-Fri',
      description: 'Applebee\'s Happy Hour features half-price appetizers and $1-5 cocktails Monday through Friday.',
      free_item: null,
      discount_percent: 50,
      requires_app: false, requires_signup: false, requires_purchase: true,
      confidence_score: 0.9,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free appetizer when you join',
      description: 'Join Applebee\'s Rewards and get a free appetizer on your next visit.',
      free_item: 'Free appetizer',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'bogo',
      title: '$1 margaritas on Wednesdays',
      description: 'Applebee\'s "Neighborhood Drink of the Month" — get $1 margaritas on Irresist-A-Bowls Wednesdays.',
      free_item: null,
      requires_app: false, requires_signup: false, requires_purchase: true,
      confidence_score: 0.85,
    },
  ],
  'chilis': [
    {
      deal_type: 'happy_hour',
      title: 'Happy Hour — $5 drinks & apps Mon-Fri 3-6pm',
      description: 'Chili\'s Happy Hour runs Mon-Fri 3-6pm with $5 margaritas and half-price appetizers.',
      free_item: null,
      discount_percent: 50,
      requires_app: false, requires_signup: false, requires_purchase: true,
      confidence_score: 0.9,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free chips & salsa when you join',
      description: 'Join My Chili\'s Rewards and get free chips & salsa on your first visit.',
      free_item: 'Chips & salsa',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'panera': [
    {
      deal_type: 'birthday',
      title: 'Free pastry on your birthday',
      description: 'Join MyPanera Rewards and get a free pastry during your birthday month.',
      free_item: 'Free pastry',
      requires_app: false, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
    {
      deal_type: 'app_deal',
      title: 'Unlimited Sip Club — coffee & more',
      description: 'Panera Unlimited Sip Club: $14.99/month for unlimited self-serve drinks, including coffee, tea, and lemonade.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.9,
    },
  ],
  'wingstop': [
    {
      deal_type: 'app_deal',
      title: 'BOGO 10-piece wings on the app',
      description: 'Get a free 10-piece order of wings when you buy one through the Wingstop app.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.8,
    },
    {
      deal_type: 'bogo',
      title: 'BOGO wing orders on the app',
      description: 'Buy one wing order, get one free through the Wingstop app. New BOGO deals every month.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.8,
    },
  ],
  'raising-canes': [
    {
      deal_type: 'signup_bonus',
      title: 'Free Caniac Combo when you join',
      description: 'Join the Caniac Club and get a free Caniac Combo on your first visit.',
      free_item: 'Caniac Combo',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'rewards_program',
      title: 'Earn free chicken with Caniac Club',
      description: 'Caniac Club members earn points on every order, redeemable for free chicken fingers, combos, and more.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: true,
      confidence_score: 0.85,
    },
  ],
  'popeyes': [
    {
      deal_type: 'birthday',
      title: 'Free 3-piece tenders on your birthday',
      description: 'Join Popeyes Rewards and get free 3-piece Handcrafted Tenders during your birthday month.',
      free_item: '3-piece Handcrafted Tenders',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: '$3.99 chicken sandwich deals',
      description: 'Get the Popeyes Classic Chicken Sandwich for $3.99 and other exclusive deals through the app.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'panda-express': [
    {
      deal_type: 'signup_bonus',
      title: 'Free plate when you join',
      description: 'Join Panda Rewards and get a free plate (2 sides + 1 entrée) on your first app order.',
      free_item: 'Free plate',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'app_deal',
      title: 'Bonus rewards & exclusive app deals',
      description: 'Order through the Panda Express app for bonus points, exclusive offers, and early access to new dishes.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'dairy-queen': [
    {
      deal_type: 'app_deal',
      title: '$1 Blizzard Sundays on the app',
      description: 'Get a small Blizzard for $1 every Sunday through the DQ app. Must order through the app to redeem.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free small Blizzard when you join',
      description: 'Join DQ Rewards and get a free small Blizzard on your next visit.',
      free_item: 'Small Blizzard',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.85,
    },
  ],
  'baskin-robbins': [
    {
      deal_type: 'app_deal',
      title: '$1 soft serve & app exclusives',
      description: 'Get $1 soft serve and other exclusive deals through the Baskin-Robbins app. New deals every month.',
      free_item: null,
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
    {
      deal_type: 'signup_bonus',
      title: 'Free scoop when you join',
      description: 'Join Baskin-Robbins Rewards and get a free scoop of ice cream on your next visit.',
      free_item: 'Free scoop',
      requires_app: true, requires_signup: true, requires_purchase: false,
      confidence_score: 0.8,
    },
  ],
};

function getLocationsForChain(deals, chainSlug) {
  const seen = new Set();
  const locations = [];
  for (const deal of deals) {
    if (deal.chain_slug === chainSlug) {
      // Use lat/lng as unique location key
      const key = `${deal.lat},${deal.lng}`;
      if (!seen.has(key)) {
        seen.add(key);
        locations.push({
          lat: deal.lat,
          lng: deal.lng,
          address: deal.address,
          city: deal.city,
          state: deal.state,
          zip: deal.zip,
          phone: deal.phone,
          opening_hours: deal.opening_hours,
          location_name: deal.location_name,
          // Extract original ID from deal_id (last part)
          location_id: deal.deal_id.split('_').pop(),
        });
      }
    }
  }
  return locations;
}

function getExistingDealTypes(deals, chainSlug) {
  const types = new Set();
  for (const deal of deals) {
    if (deal.chain_slug === chainSlug) {
      types.add(deal.deal_type);
    }
  }
  return types;
}

let totalInjected = 0;

for (const file of fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(INPUT_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath));
  const deals = data.deals || [];
  
  if (deals.length === 0) continue;

  const newDeals = [];
  let injectedCount = 0;

  for (const [chainSlug, templates] of Object.entries(CHAIN_DEAL_TEMPLATES)) {
    const locations = getLocationsForChain(deals, chainSlug);
    if (locations.length === 0) continue; // Chain not in this city

    const existingTypes = getExistingDealTypes(deals, chainSlug);
    const sourceUrl = CHAIN_REWARDS_URLS[chainSlug] || `https://www.${chainSlug.replace('-', '')}.com`;

    for (const template of templates) {
      if (existingTypes.has(template.deal_type)) continue; // Already have this type

      // Generate new deals for all locations
      for (const loc of locations) {
        const dealId = `${chainSlug}_${template.deal_type}_${loc.location_id}_injected`;
        const newDeal = {
          deal_id: dealId,
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
          is_recurring: true,
          chain_slug: chainSlug,
          location_name: loc.location_name,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          zip: loc.zip,
          lat: loc.lat,
          lng: loc.lng,
          phone: loc.phone,
          opening_hours: loc.opening_hours,
        };
        newDeal.food_tags = tagDeal(newDeal); // deal-level tagging
        newDeal.claim_type = getClaimType(newDeal);
        newDeal.claim_steps = getClaimSteps(newDeal);
        if (newDeal.deal_type === 'happy_hour') {
          const hh = HAPPY_HOUR_DATA[newDeal.chain_slug];
          if (hh) {
            newDeal.happy_hour_start = hh.start;
            newDeal.happy_hour_end = hh.end;
            newDeal.happy_hour_days = hh.days;
            newDeal.happy_hour_note = hh.note;
          }
        }
        newDeals.push(newDeal);
        injectedCount++;
      }
    }
  }

  if (newDeals.length > 0) {
    data.deals = [...deals, ...newDeals];
    data.deal_count = data.deals.length;
    fs.writeFileSync(filePath, JSON.stringify(data));
    console.log(`${file}: injected ${injectedCount} new deals (total: ${data.deals.length})`);
    totalInjected += injectedCount;
  } else {
    console.log(`${file}: nothing to inject`);
  }
}

console.log(`\nTotal injected: ${totalInjected} deals across all cities`);
