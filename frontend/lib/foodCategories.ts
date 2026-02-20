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
  'casual-dining': '🍽️ Dine-In',
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
  'drinks',         // Sonic half-price drinks, Starbucks, Dunkin' happy hour
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
