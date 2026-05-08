#!/usr/bin/env node
// enrich-deals.js — Enriches deal data with chain-specific descriptions and removes empty deal types

const fs = require('fs');
const path = require('path');

const DEALS_DIR = path.join(__dirname, 'data/output/deals');

// Chains that legitimately have happy_hour / bogo deals
const HAPPY_HOUR_CHAINS = new Set(['sonic', 'applebees', 'chilis', 'dennys', 'starbucks']);
const BOGO_CHAINS = new Set(['wingstop', 'applebees', 'burger-king', 'subway']);

const CHAIN_DEAL_DESCRIPTIONS = {
  'mcdonalds': {
    'birthday': { title: "Free McDouble on your birthday", description: "McDonald's MyMcDonald's Rewards members get a free McDouble or McChicken on their birthday via the app.", free_item: 'McDouble or McChicken' },
    'app_deal': { title: 'Weekly app deals & free fries', description: "Download the McDonald's app for weekly BOGO deals, free medium fries with any $1+ purchase, and exclusive app-only prices.", free_item: 'Medium fries' },
    'signup_bonus': { title: 'Free Medium Fries when you join', description: "Sign up for MyMcDonald's Rewards and get a free medium fries with your first app order.", free_item: 'Medium fries' },
    'rewards_program': { title: "Earn points with MyMcDonald's Rewards", description: "Join MyMcDonald's Rewards to earn 100 points per $1 spent, redeemable for free menu items.", free_item: null },
  },
  'chipotle': {
    'birthday': { title: 'Free entrée on your birthday', description: 'Chipotle Rewards members get a free burrito, bowl, salad, or order of tacos on their birthday. Must order through the app or online.', free_item: 'Burrito, bowl, salad, or tacos' },
    'signup_bonus': { title: 'Free chips & guac when you join', description: 'Sign up for Chipotle Rewards and get free chips and guacamole with your first order.', free_item: 'Chips & guacamole' },
    'app_deal': { title: 'Extra points & exclusive app deals', description: 'Order through the Chipotle app for bonus points, double protein promotions, and exclusive limited-time offers.', free_item: null },
    'rewards_program': { title: 'Earn free food with Chipotle Rewards', description: 'Chipotle Rewards members earn 10 points per $1 spent. Redeem for free menu items starting at 1,250 points.', free_item: null },
  },
  'starbucks': {
    'birthday': { title: 'Free drink or food item on your birthday', description: 'Starbucks Rewards members get a free handcrafted drink or food item of any size on their birthday.', free_item: 'Any size drink or food' },
    'app_deal': { title: 'Double stars & bonus rewards', description: 'Star Dash challenges, bonus star offers, and limited-time happy hour deals via the Starbucks app.', free_item: null },
    'signup_bonus': { title: '25 Bonus Stars when you join', description: 'Join Starbucks Rewards and earn 25 bonus stars on your first purchase through the app.', free_item: null },
    'happy_hour': { title: 'Happy Hour — 50% off drinks', description: 'Starbucks seasonal Happy Hour events offer 50% off select drinks, usually Thursday afternoons. Check the app for current offers.', free_item: null },
    'rewards_program': { title: 'Earn free drinks with Starbucks Rewards', description: 'Starbucks Rewards: earn Stars on every purchase and redeem for free drinks, food, and more.', free_item: null },
  },
  'subway': {
    'birthday': { title: 'Free 6-inch sub on your birthday', description: 'Subway MVP Rewards members get a free 6-inch sub on their birthday with any footlong purchase.', free_item: '6-inch sub' },
    'signup_bonus': { title: 'Free cookie when you sign up', description: 'Join Subway MVP Rewards and get a free cookie with your next order.', free_item: 'Cookie' },
    'app_deal': { title: 'BOGO footlong Mondays', description: 'Subway app members get Buy One Get One footlongs on Mondays. Check the app for current weekly deals.', free_item: null },
    'rewards_program': { title: 'Earn free subs with Subway MVP Rewards', description: 'Subway MVP Rewards: earn tokens on every purchase and redeem for free subs and more.', free_item: null },
  },
  'dunkin': {
    'birthday': { title: 'Free drink on your birthday', description: 'DD Perks members get a free any-size drink on their birthday.', free_item: 'Any size drink' },
    'signup_bonus': { title: 'Free medium drink when you join', description: 'Join DD Perks rewards and get a free medium beverage with your first app purchase.', free_item: 'Medium drink' },
    'app_deal': { title: '$3 medium lattes on the app', description: 'Exclusive app deals on lattes, cold brews, and bakery items. New deals every month.', free_item: null },
    'rewards_program': { title: 'Earn points with DD Perks', description: 'DD Perks members earn 5 points per $1 spent, redeemable for free drinks and food.', free_item: null },
  },
  'chick-fil-a': {
    'birthday': { title: 'Birthday reward — free treat', description: 'Chick-fil-A One members receive a birthday reward during their birthday month — typically a free dessert or menu item.', free_item: 'Birthday reward' },
    'signup_bonus': { title: 'Free sandwich when you join', description: 'Download the Chick-fil-A app, join Chick-fil-A One, and claim a free sandwich on your first visit.', free_item: 'Chicken sandwich' },
    'rewards_program': { title: 'Earn points on every visit', description: 'Chick-fil-A One members earn points on every purchase, redeemable for free food, desserts, and more.', free_item: null },
    'app_deal': { title: 'Exclusive Chick-fil-A app deals', description: 'Chick-fil-A One app members get exclusive limited-time offers, double points days, and early access to new menu items.', free_item: null },
  },
  'burger-king': {
    'birthday': { title: 'Free Whopper Jr. on your birthday', description: 'Royal Perks members get a free Whopper Jr. on their birthday via the BK app.', free_item: 'Whopper Jr.' },
    'signup_bonus': { title: 'Free Whopper when you join', description: 'Download the Burger King app, join Royal Perks, and get a free Whopper with your first app order.', free_item: 'Whopper' },
    'app_deal': { title: 'BOGO Whopper on the app', description: 'Burger King app regularly offers Buy One Get One Whopper deals. Check app weekly for latest offers.', free_item: null },
    'rewards_program': { title: 'Earn crowns with Royal Perks', description: 'Royal Perks members earn crowns on every purchase, redeemable for free menu items.', free_item: null },
    'bogo': { title: 'BOGO Whopper deal', description: 'Buy One Get One free Whopper via the BK app. Check app for current BOGO offers.', free_item: null },
  },
  'wendys': {
    'birthday': { title: 'Free Frosty on your birthday', description: "Wendy's Rewards members get a free Jr. Frosty on their birthday. Download the app to join.", free_item: 'Jr. Frosty' },
    'signup_bonus': { title: 'Free Jr. Frosty when you join', description: "Join Wendy's Rewards and get a free Jr. Frosty with your next purchase.", free_item: 'Jr. Frosty' },
    'app_deal': { title: "Daily Wendy's app deals", description: "The Wendy's app offers daily deals including $1 Dave's Singles, free nuggets, and BOGO combos.", free_item: null },
    'rewards_program': { title: "Earn Wendy's Rewards points", description: "Wendy's Rewards: earn 10 points per $1 spent. Redeem for free Jr. Frosties, nuggets, and more.", free_item: null },
  },
  'pizza-hut': {
    'birthday': { title: 'Birthday reward via Hut Rewards', description: 'Hut Rewards members get a birthday reward during their birthday month — typically a free personal pan pizza.', free_item: 'Personal pan pizza' },
    'signup_bonus': { title: 'Free medium pizza when you join', description: 'Join Hut Rewards and get a free medium 1-topping pizza on your next order.', free_item: 'Medium 1-topping pizza' },
    'app_deal': { title: '$10.99 large any-topping pizzas', description: 'Ongoing app deal: large 1-topping carryout pizzas for $10.99. Order through the Pizza Hut app.', free_item: null },
    'rewards_program': { title: 'Earn free pizza with Hut Rewards', description: 'Hut Rewards members earn points on every order, redeemable for free pizzas and sides.', free_item: null },
  },
  'dominos': {
    'signup_bonus': { title: 'Free medium pizza on your first order', description: "New Domino's Rewards members get a free medium 2-topping pizza on their first order through the app.", free_item: 'Medium 2-topping pizza' },
    'app_deal': { title: 'Mix & Match — 2 for $6.99 each', description: "Order 2 or more items from Domino's Mix & Match menu and pay just $6.99 each: medium 2-topping pizzas, pasta, sandwiches, and more.", free_item: null },
    'rewards_program': { title: 'Free pizza every 60 points', description: "Domino's Rewards: earn 10 points per $10 spent. 60 points = free medium 2-topping pizza.", free_item: null },
    'birthday': { title: 'Birthday reward from Dominos', description: "Domino's Rewards members get a birthday reward during their birthday month.", free_item: 'Birthday reward' },
  },
  'taco-bell': {
    'signup_bonus': { title: 'Free Crunchy Taco when you join', description: 'Join Taco Bell Rewards and get a free Crunchy Taco on your next order through the app.', free_item: 'Crunchy Taco' },
    'birthday': { title: 'Birthday reward — free Cinnabon Delights', description: 'Taco Bell Rewards members get 4 free Cinnabon Delights on their birthday.', free_item: '4 Cinnabon Delights' },
    'app_deal': { title: '$2 burritos & exclusive app deals', description: 'Exclusive Taco Bell app deals: $2 burritos, free Doritos Locos Tacos, BOGO offers. New deals weekly.', free_item: null },
    'rewards_program': { title: 'Earn free food with Taco Bell Rewards', description: 'Taco Bell Rewards: earn points on every purchase and redeem for free Crunchy Tacos and more.', free_item: null },
  },
  'kfc': {
    'signup_bonus': { title: 'Free chicken sandwich when you join', description: 'Sign up for KFC Rewards and get a free chicken sandwich with your first app order.', free_item: 'Chicken sandwich' },
    'birthday': { title: 'Birthday freebie from KFC', description: 'KFC Rewards members get a special birthday reward during their birthday month.', free_item: 'Birthday reward' },
    'app_deal': { title: '$5 fill-up meals on the app', description: 'KFC app offers $5 Fill Ups, nugget deals, and BOGO chicken sandwiches. Download to claim.', free_item: null },
    'rewards_program': { title: 'Earn free chicken with KFC Rewards', description: 'KFC Rewards members earn points on every purchase, redeemable for free chicken and sides.', free_item: null },
  },
  'popeyes': {
    'signup_bonus': { title: 'Free chicken sandwich when you join', description: 'Join Popeyes Rewards via the app and get a free Classic Chicken Sandwich on your first visit.', free_item: 'Classic Chicken Sandwich' },
    'birthday': { title: 'Free 3-piece tenders on your birthday', description: 'Popeyes Rewards members get free 3-piece Handcrafted Tenders on their birthday.', free_item: '3-piece Handcrafted Tenders' },
    'app_deal': { title: '$3.99 chicken sandwich deals', description: 'Weekly Popeyes app deals on sandwiches, tenders, and family meals. Check app for current offers.', free_item: null },
    'rewards_program': { title: 'Earn free chicken with Popeyes Rewards', description: 'Popeyes Rewards members earn points on every purchase, redeemable for free chicken and sides.', free_item: null },
  },
  'sonic': {
    'happy_hour': { title: 'Happy Hour — half-price drinks & slushes', description: 'Every day from 2pm-4pm: half-price drinks, slushes, and shakes at Sonic. No app required at most locations.', free_item: null },
    'app_deal': { title: 'Half-price drinks all day on the app', description: 'Sonic app members can get half-price drinks and slushes all day long — not just during Happy Hour.', free_item: null },
    'signup_bonus': { title: 'Free Route 44 drink when you join', description: 'Download the My Sonic app and get a free Route 44 drink on your first order.', free_item: 'Route 44 drink' },
    'rewards_program': { title: 'Earn Sonic Rewards points', description: 'My Sonic app members earn points on every purchase, redeemable for free drinks and food.', free_item: null },
  },
  'panda-express': {
    'signup_bonus': { title: 'Free plate when you join', description: 'Sign up for Panda Rewards and get a free plate (2 sides + 1 entrée) on your next visit.', free_item: 'Free plate' },
    'birthday': { title: 'Free entrée on your birthday', description: 'Panda Rewards members get a free entrée on their birthday via the app.', free_item: 'Free entrée' },
    'app_deal': { title: 'Bonus rewards & exclusive app deals', description: 'Panda Rewards app offers double points days, limited-time menu items, and exclusive deals.', free_item: null },
    'rewards_program': { title: 'Earn free food with Panda Rewards', description: 'Panda Rewards members earn points on every purchase, redeemable for free menu items.', free_item: null },
  },
  'wingstop': {
    'signup_bonus': { title: 'Free 6 wings when you join', description: 'Join Wingstop Club via the app and get 6 free wings with your first order of $10+.', free_item: '6 wings' },
    'birthday': { title: 'Free wings on your birthday', description: 'Wingstop Club members receive a birthday reward — free wings on their birthday.', free_item: 'Free wings' },
    'app_deal': { title: 'BOGO 10-piece wings on the app', description: 'Wingstop app regularly offers Buy One Get One on 10-piece wing orders. Check app for current deals.', free_item: null },
    'bogo': { title: 'BOGO 10-piece wings — Wingstop deal', description: 'Buy One Get One free on 10-piece classic wing orders via the Wingstop app.', free_item: null },
    'rewards_program': { title: 'Earn free wings with Wingstop Club', description: 'Wingstop Club members earn points on every order, redeemable for free wings and sides.', free_item: null },
  },
  'jersey-mikes': {
    'signup_bonus': { title: 'Free sub when you join', description: "Sign up for Jersey Mike's Subs Rewards and get a free regular sub with your first purchase.", free_item: 'Regular sub' },
    'birthday': { title: 'Free sub on your birthday', description: "Jersey Mike's Subs Rewards members get a free sub of any size on their birthday.", free_item: 'Sub of your choice' },
    'app_deal': { title: 'Free bag of chips with any order', description: "Jersey Mike's app deal: free bag of chips with any sub purchase. Also get exclusive member-only deals.", free_item: 'Bag of chips' },
    'rewards_program': { title: "Earn free subs with Jersey Mike's Rewards", description: "Jersey Mike's Subs Rewards members earn points on every purchase, redeemable for free subs.", free_item: null },
  },
  'raising-canes': {
    'signup_bonus': { title: 'Free Caniac Combo when you join', description: "Join Raising Cane's email list and get a coupon for a free Caniac Combo with purchase.", free_item: 'Caniac Combo' },
    'app_deal': { title: 'Free sauce cup with the app', description: "Order on the Raising Cane's app for exclusive deals and free Cane's Sauce on select orders.", free_item: null },
    'rewards_program': { title: 'Earn free chicken with Caniac Club', description: 'Join the Caniac Club for rewards, exclusive offers, and free chicken on special occasions.', free_item: null },
    'birthday': { title: 'Birthday reward from Raising Canes', description: "Raising Cane's fans get a special birthday treat during their birthday month.", free_item: 'Birthday reward' },
  },
  'whataburger': {
    'signup_bonus': { title: 'Free Whataburger when you join', description: 'Join Whataburger Rewards and get a free Whataburger with your first app order.', free_item: 'Whataburger' },
    'birthday': { title: 'Free burger on your birthday', description: "Whataburger Rewards members get a free burger of their choice on their birthday.", free_item: 'Free burger' },
    'app_deal': { title: '$3 Whataburger combos on the app', description: 'Exclusive Whataburger app deals on combos, free fries, and BOGO burgers. Texas locations only.', free_item: null },
    'rewards_program': { title: 'Earn free food with Whataburger Rewards', description: 'Whataburger Rewards members earn points on every purchase, redeemable for free burgers and sides.', free_item: null },
  },
  'jack-in-the-box': {
    'signup_bonus': { title: 'Free Jumbo Jack when you join', description: 'Sign up for Jack Pack Rewards and get a free Jumbo Jack on your next app order.', free_item: 'Jumbo Jack' },
    'birthday': { title: 'Free birthday reward', description: 'Jack Pack Rewards members get a birthday reward during their birthday month via the app.', free_item: 'Birthday reward' },
    'app_deal': { title: '2 tacos for $1 — app exclusive', description: 'Get 2 tacos for $1 and other exclusive deals through the Jack in the Box app. New deals every week.', free_item: null },
    'rewards_program': { title: 'Earn free food with Jack Pack Rewards', description: 'Jack Pack Rewards members earn points on every purchase, redeemable for free Jumbo Jacks and more.', free_item: null },
  },
  'del-taco': {
    'signup_bonus': { title: 'Free Del Combo when you join', description: "Join Del's Rewards app and get a free Del Combo on your first order.", free_item: 'Del Combo' },
    'app_deal': { title: 'Free taco with any purchase on app', description: "Del Taco app regularly offers a free taco with any purchase. Check app for current deals.", free_item: 'Free taco' },
    'birthday': { title: "Birthday freebie via Del's Rewards", description: "Del's Rewards members get a birthday reward — free taco or item on their birthday.", free_item: 'Birthday item' },
    'rewards_program': { title: "Earn free tacos with Del's Rewards", description: "Del's Rewards members earn points on every purchase, redeemable for free tacos and burritos.", free_item: null },
  },
  'shake-shack': {
    'signup_bonus': { title: 'Free ShackBurger when you join', description: 'Join Shack Track via the app and get a free ShackBurger on your first order.', free_item: 'ShackBurger' },
    'app_deal': { title: 'Exclusive app deals & double points', description: 'Shake Shack app members get exclusive deals on burgers, shakes, and limited-time menu items.', free_item: null },
    'birthday': { title: 'Birthday reward from Shake Shack', description: 'Shack Track members receive a birthday reward during their birthday month.', free_item: 'Birthday reward' },
    'rewards_program': { title: 'Earn free food with Shack Track', description: 'Shack Track members earn points on every purchase, redeemable for free ShackBurgers and shakes.', free_item: null },
  },
  'waffle-house': {
    'signup_bonus': { title: 'Free All-Star Special when you join', description: 'Sign up for Waffle House Regulars and get a coupon for a free All-Star Special on your next visit.', free_item: 'All-Star Special' },
    'app_deal': { title: 'Member discounts & specials', description: 'Waffle House Regulars app members get exclusive discounts and early access to special menu items.', free_item: null },
    'birthday': { title: 'Free waffle on your birthday', description: 'Waffle House Regulars members get a free waffle on their birthday.', free_item: 'Waffle' },
    'rewards_program': { title: 'Earn rewards with Waffle House Regulars', description: 'Waffle House Regulars members earn points on every visit, redeemable for free menu items.', free_item: null },
  },
  'ihop': {
    'birthday': { title: 'Free Birthday Pancakes stack', description: 'IHOP Pancake Rewards members get a free stack of birthday pancakes during their birthday month.', free_item: 'Birthday pancake stack' },
    'signup_bonus': { title: 'Free short stack when you join', description: 'Join IHOP International Bank of Pancakes (MyHop) and get a free short stack of pancakes.', free_item: 'Short stack pancakes' },
    'app_deal': { title: '$5 pancake deals on the app', description: 'IHOP app offers weekly deals on pancake combos, free coffee, and early bird specials.', free_item: null },
    'rewards_program': { title: 'Earn free pancakes with IHOP Rewards', description: 'IHOP Pancake Rewards members earn PanCoins on every purchase, redeemable for free pancakes.', free_item: null },
  },
  'dennys': {
    'birthday': { title: 'Free Birthday Slam on your birthday', description: "Sign up for Denny's Rewards and get a free Grand Slam breakfast on your birthday.", free_item: 'Grand Slam breakfast' },
    'signup_bonus': { title: 'Free Grand Slam when you join', description: "Join Denny's Rewards and get a free Original Grand Slam on your next visit.", free_item: 'Original Grand Slam' },
    'happy_hour': { title: '$4 value menu all day', description: "Denny's Value Slams offer full breakfast combos for $4-6 all day. Available at most locations.", free_item: null },
    'app_deal': { title: "Denny's app-only deals", description: "Get exclusive deals on slams and more through the Denny's app.", free_item: null },
    'rewards_program': { title: "Earn free food with Denny's Rewards", description: "Denny's Rewards members earn points on every purchase, redeemable for free Grand Slams and more.", free_item: null },
  },
  'applebees': {
    'happy_hour': { title: 'Happy Hour — half-price appetizers', description: "Applebee's Happy Hour: half-price appetizers and $1-5 drinks Monday-Friday at the bar. Times vary by location.", free_item: null },
    'bogo': { title: '$1 margaritas on Wednesdays', description: "Neighborhood Drinks: Applebee's offers $1 margaritas and other specials throughout the week at participating locations.", free_item: null },
    'signup_bonus': { title: 'Free appetizer when you join', description: "Join Applebee's email rewards and get a coupon for a free appetizer on your next visit.", free_item: 'Free appetizer' },
    'birthday': { title: "Birthday freebie from Applebee's", description: "Applebee's Rewards members get a birthday dessert during their birthday month.", free_item: 'Birthday dessert' },
    'rewards_program': { title: "Earn rewards with Applebee's Rewards", description: "Applebee's Rewards members earn points on every visit, redeemable for free appetizers and drinks.", free_item: null },
  },
  'chilis': {
    'happy_hour': { title: "Happy Hour — $5 drinks & apps", description: "Chili's Happy Hour: $5 margaritas, $4 beers, and half-price appetizers at the bar. Mon-Fri 3-6pm at most locations.", free_item: null },
    'birthday': { title: 'Free dessert on your birthday', description: "Chili's Rewards members get a free dessert during their birthday month.", free_item: 'Free dessert' },
    'signup_bonus': { title: 'Free chips & salsa when you join', description: "Join My Chili's Rewards and get free chips and salsa on your next visit.", free_item: 'Chips & salsa' },
    'rewards_program': { title: "Earn free food with My Chili's Rewards", description: "My Chili's Rewards members earn bonus points on every visit, redeemable for free apps and drinks.", free_item: null },
    'app_deal': { title: "Exclusive Chili's app deals", description: "The Chili's app offers exclusive deals on margaritas, appetizers, and combo meals.", free_item: null },
  },
  'olive-garden': {
    'birthday': { title: 'Birthday reward from Olive Garden', description: 'Olive Garden eClub members receive a birthday reward — free dessert or appetizer during birthday month.', free_item: 'Birthday reward' },
    'signup_bonus': { title: 'Free appetizer when you join', description: "Sign up for Olive Garden's eClub and receive a coupon for a free appetizer or dessert.", free_item: 'Appetizer or dessert' },
    'app_deal': { title: 'Unlimited breadsticks & never-ending pasta', description: 'Olive Garden app members get early access to Never Ending Pasta Bowl and exclusive deals.', free_item: null },
    'rewards_program': { title: 'Earn rewards with Olive Garden eClub', description: 'Olive Garden eClub members get exclusive deals, birthday rewards, and early access to seasonal offers.', free_item: null },
  },
  'red-lobster': {
    'birthday': { title: 'Free dessert on your birthday', description: 'My Red Lobster Rewards members get a free dessert during their birthday month.', free_item: 'Free dessert' },
    'signup_bonus': { title: 'Free appetizer when you join', description: 'Join My Red Lobster Rewards and get a free appetizer on your next visit.', free_item: 'Free appetizer' },
    'rewards_program': { title: 'Earn toward free lobster', description: 'My Red Lobster Rewards: earn points on every visit, redeemable for free menu items including lobster dishes.', free_item: null },
    'app_deal': { title: "Exclusive Red Lobster app deals", description: "Red Lobster app members get exclusive deals on Endless Shrimp, Cheddar Bay Biscuits, and more.", free_item: null },
  },
  'baskin-robbins': {
    'birthday': { title: 'Free birthday scoop', description: 'Baskin-Robbins Rewards members get a free scoop on their birthday. Join via the app.', free_item: 'Free scoop of ice cream' },
    'signup_bonus': { title: 'Free scoop when you join', description: 'Join Baskin-Robbins Rewards and get a free scoop of ice cream on your next visit.', free_item: 'Free scoop' },
    'app_deal': { title: '$1 soft serve & app exclusives', description: 'Baskin-Robbins app offers $1 soft serve cones, BOGO scoops, and monthly special deals.', free_item: null },
    'rewards_program': { title: 'Earn free scoops with BR Rewards', description: 'Baskin-Robbins Rewards members earn points on every purchase, redeemable for free scoops and sundaes.', free_item: null },
  },
  'cold-stone-creamery': {
    'birthday': { title: 'Free Creation on your birthday', description: 'My Cold Stone Club members get a free ice cream Creation of their choice during their birthday month.', free_item: 'Free ice cream Creation' },
    'signup_bonus': { title: 'BOGO Creation when you join', description: 'Join My Cold Stone Club and get a Buy One Get One free Creation coupon.', free_item: 'BOGO Creation' },
    'app_deal': { title: '$5 Creations on the app', description: 'Cold Stone app offers $5 Like It Creations and other exclusive deals. Download to redeem.', free_item: null },
    'rewards_program': { title: 'Earn free Creations with Cold Stone Club', description: 'My Cold Stone Club members earn points on every purchase, redeemable for free ice cream Creations.', free_item: null },
  },
  'dairy-queen': {
    'birthday': { title: 'Free Blizzard on your birthday', description: 'DQ Rewards members get a free Blizzard Treat of any size on their birthday via the app.', free_item: 'Free Blizzard Treat' },
    'signup_bonus': { title: 'Free small Blizzard when you join', description: 'Join DQ Rewards and get a free small Blizzard on your next app order.', free_item: 'Small Blizzard' },
    'app_deal': { title: '$1 Blizzard Sundays', description: 'DQ Rewards app members get $1 Blizzard Treats on Sundays. Check app for current weekly deals.', free_item: null },
    'rewards_program': { title: 'Earn free Blizzards with DQ Rewards', description: 'DQ Rewards members earn points on every purchase, redeemable for free Blizzards and Dilly Bars.', free_item: null },
  },
  'papa-johns': {
    'signup_bonus': { title: 'Free pizza when you join', description: "Sign up for Papa Rewards and get a free medium pizza on your first order.", free_item: 'Medium pizza' },
    'birthday': { title: 'Birthday reward from Papa Johns', description: "Papa Rewards members get a birthday reward during their birthday month.", free_item: 'Birthday reward' },
    'app_deal': { title: 'Papa Rewards app deals', description: "Exclusive Papa Johns app deals on large pizzas, sides, and combo meals. New offers weekly.", free_item: null },
    'rewards_program': { title: 'Earn free pizza with Papa Rewards', description: "Papa Rewards members earn Papa Dough on every order, redeemable for free pizzas and sides.", free_item: null },
  },
  'panera': {
    'signup_bonus': { title: 'Free bakery item when you join', description: "Sign up for MyPanera and get a free bakery item on your next visit.", free_item: 'Bakery item' },
    'birthday': { title: 'Birthday reward from Panera', description: "MyPanera members get a birthday reward — free pastry or drink during their birthday month.", free_item: 'Birthday reward' },
    'app_deal': { title: 'Unlimited coffee & tea subscription', description: "Panera's Unlimited Sip Club: $12.99/month for unlimited self-serve beverages including coffee, tea, and more.", free_item: null },
    'rewards_program': { title: 'Earn free food with MyPanera', description: "MyPanera members earn rewards on every purchase — free pastries, soups, and bakery items.", free_item: null },
  },
};

let enriched = 0;
let removed = 0;
let kept = 0;
let total = 0;

if (!fs.existsSync(DEALS_DIR)) {
  console.error('Deals directory not found:', DEALS_DIR);
  process.exit(1);
}

for (const file of fs.readdirSync(DEALS_DIR).filter(f => f.endsWith('.json'))) {
  const filePath = path.join(DEALS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  if (!data.deals || data.deals.length === 0) continue;
  
  const newDeals = [];
  
  for (const deal of data.deals) {
    total++;
    
    // Remove bogo/happy_hour deals from chains that don't have them
    if (deal.deal_type === 'bogo' && !BOGO_CHAINS.has(deal.chain_slug)) {
      removed++;
      continue;
    }
    if (deal.deal_type === 'happy_hour' && !HAPPY_HOUR_CHAINS.has(deal.chain_slug)) {
      removed++;
      continue;
    }
    
    // Enrich with chain-specific descriptions
    const chainMap = CHAIN_DEAL_DESCRIPTIONS[deal.chain_slug];
    if (chainMap) {
      const typeMap = chainMap[deal.deal_type];
      if (typeMap) {
        deal.title = typeMap.title;
        deal.description = typeMap.description;
        if (typeMap.free_item !== undefined) deal.free_item = typeMap.free_item;
        enriched++;
      } else {
        kept++;
      }
    } else {
      kept++;
    }
    
    newDeals.push(deal);
  }
  
  data.deals = newDeals;
  data.deal_count = newDeals.length;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

console.log(`Done! Enriched: ${enriched}, Removed (empty types): ${removed}, Kept as-is: ${kept}, Total processed: ${total}`);
