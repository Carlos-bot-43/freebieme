'use client';

import { useState, useEffect } from 'react';
import { Deal, DEAL_TYPE_LABELS, DEAL_TYPE_COLORS, distanceMiles } from '../lib/types';
import { toggleSavedDeal, isDealSaved } from '../lib/savedDeals';

const DEAL_TYPE_BORDER: Record<string, string> = {
  birthday: 'border-l-pink-400',
  signup_bonus: 'border-l-purple-400',
  app_deal: 'border-l-blue-400',
  bogo: 'border-l-orange-400',
  happy_hour: 'border-l-yellow-400',
  rewards_program: 'border-l-green-400',
  freebie: 'border-l-emerald-400',
  discount: 'border-l-red-400',
  other: 'border-l-gray-300',
};

interface DealCardProps {
  deal: Deal;
  userLat?: number;
  userLng?: number;
}

function getDistanceBadge(distance: number): { text: string; className: string } {
  const text = distance < 0.1 ? '< 0.1 mi' : `${distance.toFixed(1)} mi`;
  if (distance <= 5) return { text, className: 'bg-green-100 text-green-700' };
  if (distance <= 10) return { text, className: 'bg-yellow-100 text-yellow-700' };
  return { text, className: 'bg-gray-100 text-gray-500' };
}

export default function DealCard({ deal, userLat, userLng }: DealCardProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isDealSaved(deal.deal_id));
  }, [deal.deal_id]);

  const typeLabel = DEAL_TYPE_LABELS[deal.deal_type] || DEAL_TYPE_LABELS.other;
  const typeColor = DEAL_TYPE_COLORS[deal.deal_type] || DEAL_TYPE_COLORS.other;
  const typeBorder = DEAL_TYPE_BORDER[deal.deal_type] || DEAL_TYPE_BORDER.other;

  const distance =
    userLat && userLng && deal.lat && deal.lng
      ? distanceMiles(userLat, userLng, deal.lat, deal.lng)
      : null;

  const distanceBadge = distance !== null ? getDistanceBadge(distance) : null;

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleToggleSave = () => {
    const nowSaved = toggleSavedDeal(deal.deal_id);
    setSaved(nowSaved);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${typeBorder} p-4 hover:shadow-md transition-shadow duration-200 flex flex-col`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-sm leading-tight block">
            {deal.location_name}
          </span>
          {deal.address && (
            <span className="text-xs text-gray-400 block truncate">{deal.address}</span>
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
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
          {typeLabel}
        </span>
        {deal.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            📱 App
          </span>
        )}
        {deal.requires_signup && !deal.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            ✍️ Sign Up
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
        {deal.discount_amount && !deal.free_item && !deal.discount_percent && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
            ${deal.discount_amount} off
          </span>
        )}
      </div>

      {/* Description (short) */}
      {deal.description && deal.description !== deal.title && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 flex-1">{deal.description}</p>
      )}

      {/* Coupon code */}
      {deal.coupon_code && (
        <div className="flex items-center gap-2 mb-2">
          <code className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-mono font-bold flex-1 truncate">
            {deal.coupon_code}
          </code>
          <button
            onClick={() => handleCopyCode(deal.coupon_code!)}
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleSave}
            title={saved ? 'Remove bookmark' : 'Save deal'}
            className={`text-base transition-colors ${saved ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
          >
            {saved ? '★' : '☆'}
          </button>
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
          <span className="text-xs text-gray-400">
            {deal.confidence_score >= 0.9 ? 'Verified' : deal.confidence_score >= 0.7 ? 'Likely valid' : 'Unverified'}
          </span>
        </div>
        <a
          href={deal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Get deal →
        </a>
      </div>
    </div>
  );
}
