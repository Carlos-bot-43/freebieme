export default function CBVBanner() {
  return (
    <a
      href="https://codingbutvibes.com"
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-indigo-600 mb-0.5">From the same team</p>
          <p className="font-semibold text-gray-900 text-sm">Want free AI tools too?</p>
          <p className="text-xs text-gray-500 mt-0.5">AI deals, tools & resources — always free</p>
        </div>
        <span className="flex-shrink-0 text-indigo-600 font-semibold text-xs whitespace-nowrap">
          Check it out →
        </span>
      </div>
    </a>
  );
}
