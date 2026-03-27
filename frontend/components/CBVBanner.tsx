export default function CBVBanner() {
  return (
    <a
      href="https://www.codingbutvibes.com?ref=freebieme"
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:bg-gray-750 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-0.5">From the same team</p>
          <p className="font-semibold text-gray-100 text-sm">Want free AI tools too?</p>
          <p className="text-xs text-gray-400 mt-0.5">
            CodingButVibes.com has the best free tiers for AI coding tools
          </p>
        </div>
        <span className="flex-shrink-0 text-gray-400 font-semibold text-xs whitespace-nowrap">
          →
        </span>
      </div>
    </a>
  );
}
