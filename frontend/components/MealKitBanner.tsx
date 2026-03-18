interface MealKit {
  name: string;
  headline: string;
  subtext: string;
  cta: string;
  affiliateUrl: string;
  emoji: string;
  color: string;
}

// Replace affiliate URLs with actual tracking links after approval
const MEAL_KITS: MealKit[] = [
  {
    name: 'HelloFresh',
    headline: 'Free meals on your first box',
    subtext: 'Up to 14 free meals + free shipping',
    cta: 'Claim offer →',
    affiliateUrl: 'https://www.hellofresh.com/plans?c=HELLOFRESH_AFFILIATE_CODE',
    emoji: '🥗',
    color: 'bg-green-50 border-green-200',
  },
  {
    name: 'EveryPlate',
    headline: '$1.49/meal on first box',
    subtext: 'Cheapest meal kit — $1.49/serving first box',
    cta: 'Get the deal →',
    affiliateUrl: 'https://www.everyplate.com/plans?promo=EVERYPLATE_AFFILIATE_CODE',
    emoji: '🍽️',
    color: 'bg-orange-50 border-orange-200',
  },
];

export default function MealKitBanner({ showAll = false }: { showAll?: boolean }) {
  const kits = showAll ? MEAL_KITS : [MEAL_KITS[0]]; // show 1 on city pages, both on homepage

  return (
    <div className="space-y-3">
      {kits.map((kit) => (
        <a
          key={kit.name}
          href={kit.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`block border rounded-xl p-4 hover:shadow-md transition-shadow ${kit.color}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-lg">{kit.emoji}</span>
                <span className="font-semibold text-gray-900 text-sm">{kit.name}</span>
                <span className="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded border">Sponsored</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{kit.headline}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kit.subtext}</p>
            </div>
            <span className="flex-shrink-0 text-xs font-semibold text-blue-600 whitespace-nowrap">
              {kit.cta}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
