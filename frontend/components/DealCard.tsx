'use client';

import { Deal, DEAL_TYPE_LABELS, DEAL_TYPE_COLORS, distanceMiles } from '../lib/types';

interface DealCardProps {
  deal: Deal;
  userLat?: number;
  userLng?: number;
}

function getDistanceBadge(distance: number): { text: string; className: string } {
  if (distance < 1) {
    return { text: `${(distance * 5280 / 1000 * 1000 / 5280).toFixed(1)} mi`, className: 'bg-green-100 text-green-700' };
  }
  if (distance <= 5) {
    return { text: `${distance.toFixed(1)} mi`, className: 'bg-green-100 text-green-700' };
  }
  if (distance <= 10) {
    return { text: `${distance.toFixed(1)} mi`, className: 'bg-yellow-100 text-yellow-700' };
  }
  return { text: `${distance.toFixed(1)} mi`, className: 'bg-gray-100 text-gray-500' };
}

export default function DealCard({ deal, userLat, userLng }: DealCardProps) {
  const typeLabel = DEAL_TYPE_LABELS[deal.deal_type] || DEAL_TYPE_LABELS.other;
  const typeColor = DEAL_TYPE_COLORS[deal.deal_type] || DEAL_TYPE_COLORS.other;

  const distance =
    userLat && userLng && deal.lat && deal.lng
      ? distanceMiles(userLat, userLng, deal.lat, deal.lng)
      : null;

  const distanceBadge = distance !== null ? getDistanceBadge(distance) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-sm leading-tight block">
            {deal.location_name}
          </span>
          {deal.address && (
            <span className="text-xs text-gray-500 block truncate">{deal.address}</span>
          )}
        </div>
        {distanceBadge && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${distanceBadge.className}`}>
            📍 {distanceBadge.text}
          </span>
        )}
      </div>

      {/* Deal title */}
      <h3 className="text-gray-900 font-medium text-sm mb-2 leading-snug">
        {deal.title}
      </h3>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
          {typeLabel}
        </span>
        {deal.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            📱 App Required
          </span>
        )}
        {deal.requires_signup && !deal.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            ✍️ Sign Up Required
          </span>
        )}
        {deal.free_item && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            🆓 {deal.free_item}
          </span>
        )}
        {deal.discount_percent && !deal.free_item && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
            {deal.discount_percent}% off
          </span>
        )}
      </div>

      {/* Description (short) */}
      {deal.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{deal.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i <= Math.round(deal.confidence_score * 5)
                    ? 'bg-green-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1">
            {deal.confidence_score >= 0.9 ? 'Verified' : deal.confidence_score >= 0.7 ? 'Likely valid' : 'Unverified'}
          </span>
        </div>
        <a
          href={deal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Get deal →
        </a>
      </div>
    </div>
  );
}
