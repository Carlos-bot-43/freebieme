// Map from chain slug to food categories
// Loaded from chains.json at build time (server) or hardcoded here for client use
export const CHAIN_FOOD_CATEGORIES: Record<string, string[]> = {
  'mcdonalds': ['burgers', 'fries', 'breakfast', 'chicken'],
  'burger-king': ['burgers', 'fries', 'breakfast'],
  'wendys': ['burgers', 'fries', 'breakfast', 'chicken'],
  'shake-shack': ['burgers', 'fries', 'shakes', 'ice-cream'],
  'whataburger': ['burgers', 'fries', 'breakfast'],
  'jack-in-the-box': ['burgers', 'tacos', 'fries', 'breakfast'],
  'del-taco': ['tacos', 'mexican', 'burgers', 'fries'],
  'dairy-queen': ['ice-cream', 'dessert', 'burgers', 'fries'],
  'sonic': ['burgers', 'fries', 'hot-dogs', 'drinks', 'ice-cream'],
  'chipotle': ['mexican', 'tacos', 'burritos'],
  'taco-bell': ['tacos', 'mexican', 'burritos'],
  'pizza-hut': ['pizza', 'wings'],
  'dominos': ['pizza', 'wings', 'sandwiches'],
  'papa-johns': ['pizza'],
  'chick-fil-a': ['chicken', 'sandwiches', 'breakfast'],
  'kfc': ['chicken', 'fries', 'breakfast'],
  'popeyes': ['chicken', 'sandwiches', 'fries'],
  'wingstop': ['wings', 'chicken', 'fries'],
  'raising-canes': ['chicken', 'fries', 'sandwiches'],
  'panda-express': ['chinese', 'asian', 'rice', 'noodles'],
  'subway': ['sandwiches', 'subs'],
  'jersey-mikes': ['sandwiches', 'subs'],
  'panera': ['sandwiches', 'soup', 'salads', 'breakfast', 'coffee'],
  'starbucks': ['coffee', 'drinks', 'breakfast'],
  'dunkin': ['coffee', 'drinks', 'donuts', 'breakfast'],
  'baskin-robbins': ['ice-cream', 'dessert'],
  'cold-stone-creamery': ['ice-cream', 'dessert'],
  'waffle-house': ['breakfast', 'waffles', 'eggs'],
  'ihop': ['breakfast', 'pancakes', 'eggs', 'waffles'],
  'dennys': ['breakfast', 'burgers', 'eggs', 'pancakes'],
  'applebees': ['burgers', 'wings', 'casual-dining', 'drinks'],
  'chilis': ['burgers', 'tacos', 'casual-dining', 'drinks'],
  'olive-garden': ['italian', 'pasta', 'casual-dining'],
  'red-lobster': ['seafood', 'casual-dining'],
};

export const FOOD_CATEGORY_LABELS: Record<string, string> = {
  'burgers': '🍔 Burgers',
  'pizza': '🍕 Pizza',
  'chicken': '🍗 Chicken',
  'tacos': '🌮 Tacos',
  'breakfast': '🍳 Breakfast',
  'coffee': '☕ Coffee',
  'ice-cream': '🍦 Ice Cream',
  'sandwiches': '🥪 Sandwiches',
  'wings': '🍖 Wings',
  'fries': '🍟 Fries',
  'mexican': '🌯 Mexican',
  'italian': '🍝 Italian',
  'seafood': '🦞 Seafood',
  'asian': '🥢 Asian',
  'dessert': '🍨 Dessert',
  'casual-dining': '🍽️ Casual Dining',
  'drinks': '🥤 Drinks',
};

// Top categories to show as quick filters (most searched food types)
export const TOP_FOOD_CATEGORIES = [
  'burgers',        // McDonald's, BK, Wendy's, Shake Shack
  'pizza',          // Pizza Hut, Domino's, Papa John's
  'chicken',        // Chick-fil-A, KFC, Popeyes, Raising Cane's
  'tacos',          // Chipotle, Taco Bell, Del Taco, Jack in the Box
  'breakfast',      // IHOP, Denny's, Waffle House, Panera
  'coffee',         // Starbucks, Dunkin', Panera
  'ice-cream',      // Dairy Queen, Baskin-Robbins, Cold Stone
  'sandwiches',     // Subway, Jersey Mike's, Panera, Chick-fil-A
  'wings',          // Wingstop, Pizza Hut (wings deals)
  'casual-dining',  // Applebee's, Chili's, Olive Garden, Red Lobster
];

// Fuzzy search: map common user search terms to food categories
export const FOOD_CATEGORY_ALIASES: Record<string, string> = {
  'burger': 'burgers',
  'burgers': 'burgers',
  'pizza': 'pizza',
  'pizzas': 'pizza',
  'chicken': 'chicken',
  'taco': 'tacos',
  'tacos': 'tacos',
  'breakfast': 'breakfast',
  'coffee': 'coffee',
  'icecream': 'ice-cream',
  'ice-cream': 'ice-cream',
  'sandwich': 'sandwiches',
  'sandwiches': 'sandwiches',
  'sub': 'sandwiches',
  'subs': 'sandwiches',
  'wings': 'wings',
  'wing': 'wings',
  'fries': 'fries',
  'fry': 'fries',
  'mexican': 'mexican',
  'italian': 'italian',
  'seafood': 'seafood',
  'asian': 'asian',
  'dessert': 'dessert',
  'drinks': 'drinks',
  'drink': 'drinks',
  'donuts': 'coffee',
  'donut': 'coffee',
  'pancakes': 'breakfast',
  'waffles': 'breakfast',
  'burrito': 'tacos',
  'burritos': 'tacos',
};
