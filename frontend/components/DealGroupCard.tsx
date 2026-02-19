'use client';

import { useState, useEffect } from 'react';
import { DealGroup, DEAL_TYPE_LABELS, DEAL_TYPE_COLORS, distanceMiles } from '../lib/types';
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

// Accurate deal-type specific badges (replaces misleading "No purchase needed")
function getDealTypeBadge(dealType: string): { icon: string; label: string; className: string } | null {
  switch (dealType) {
    case 'signup_bonus':
      return { icon: '🆓', label: 'Free with sign up', className: 'bg-purple-50 text-purple-700' };
    case 'birthday':
      return { icon: '🎂', label: 'Must join rewards', className: 'bg-pink-50 text-pink-700' };
    case 'app_deal':
      return { icon: '📲', label: 'App exclusive', className: 'bg-blue-50 text-blue-700' };
    case 'happy_hour':
      return { icon: '⏰', label: 'Time-limited', className: 'bg-yellow-50 text-yellow-700' };
    case 'freebie':
      return { icon: '🆓', label: 'Free item', className: 'bg-emerald-50 text-emerald-700' };
    case 'bogo':
      return { icon: '2️⃣', label: 'Buy one get one', className: 'bg-orange-50 text-orange-700' };
    case 'rewards_program':
      return { icon: '⭐', label: 'Earn rewards', className: 'bg-green-50 text-green-700' };
    default:
      return null;
  }
}

interface DealGroupCardProps {
  group: DealGroup;
  userLat?: number;
  userLng?: number;
  cityName?: string;
  updatedAt?: string;
}

function formatDist(d: number): string {
  return d < 0.1 ? '< 0.1 mi' : `${d.toFixed(1)} mi`;
}

function getDistBadgeClass(d: number): string {
  if (d <= 2) return 'bg-green-100 text-green-700';
  if (d <= 8) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-500';
}

export default function DealGroupCard({ group, userLat, userLng, cityName, updatedAt }: DealGroupCardProps) {
  const [showLocations, setShowLocations] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Use the first location's deal_id as the "group save" key
  const primaryDealId = group.locations[0]?.deal_id || group.group_id;

  useEffect(() => {
    setSaved(isDealSaved(primaryDealId));
  }, [primaryDealId]);

  const typeLabel = DEAL_TYPE_LABELS[group.deal_type] || DEAL_TYPE_LABELS.other;
  const typeColor = DEAL_TYPE_COLORS[group.deal_type] || DEAL_TYPE_COLORS.other;
  const typeBorder = DEAL_TYPE_BORDER[group.deal_type] || DEAL_TYPE_BORDER.other;
  const dealTypeBadge = getDealTypeBadge(group.deal_type);

  const hasLocation = !!(userLat && userLng);

  // Sort locations by distance if we have user location
  const sortedLocations = hasLocation
    ? [...group.locations].sort((a, b) => {
        const da = distanceMiles(userLat!, userLng!, a.lat, a.lng);
        const db = distanceMiles(userLat!, userLng!, b.lat, b.lng);
        return da - db;
      })
    : group.locations;

  const handleToggleSave = () => {
    const nowSaved = toggleSavedDeal(primaryDealId);
    setSaved(nowSaved);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // 2F: Social sharing
  const handleShare = async () => {
    const text = `${group.title} at ${group.location_name} — claim it free at FreebieMe`;
    const url = typeof window !== 'undefined' ? window.location.href : 'https://freebieme.vercel.app';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: group.title, text, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch { /* ignore cancel */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch { /* ignore */ }
    }
  };

  // 2G: Report expired deal
  const handleReport = () => {
    const subject = encodeURIComponent('Expired deal report');
    const body = encodeURIComponent(
      `Chain: ${group.location_name}\nDeal: ${group.title}\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}`
    );
    window.open(`mailto:deals@freebieme.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${typeBorder} p-4 hover:shadow-md transition-shadow duration-200 flex flex-col`}>
      {/* Header: Chain name + deal type badge + save + share */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900 text-base leading-tight block">
            {group.location_name}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${typeColor}`}>
            {typeLabel}
          </span>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Share button */}
          <button
            onClick={handleShare}
            title="Share this deal"
            className="text-sm text-gray-300 hover:text-blue-500 transition-colors p-0.5"
          >
            {shared ? '✅' : '🔗'}
          </button>
          {/* Save button */}
          <button
            onClick={handleToggleSave}
            title={saved ? 'Remove bookmark' : 'Save deal'}
            className={`text-xl transition-colors ${saved ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-400'}`}
          >
            {saved ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Deal title */}
      <h3 className="text-gray-900 font-semibold text-sm mb-1.5 leading-snug">
        {group.title}
      </h3>

      {/* 6B: Free item highlighted prominently right below title */}
      {group.free_item && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
            🆓 {group.free_item}
          </span>
        </div>
      )}

      {/* Description */}
      {group.description && group.description !== group.title && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 flex-1 leading-relaxed">
          {group.description}
        </p>
      )}

      {/* Discount badges (only when no free item) */}
      {!group.free_item && (group.discount_percent || group.discount_amount) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {group.discount_percent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
              {group.discount_percent}% off
            </span>
          )}
          {group.discount_amount && !group.discount_percent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
              ${group.discount_amount} off
            </span>
          )}
        </div>
      )}

      {/* Requirements row — 2B: accurate deal-type badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {/* Deal-type specific badge */}
        {dealTypeBadge && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dealTypeBadge.className}`}>
            {dealTypeBadge.icon} {dealTypeBadge.label}
          </span>
        )}
        {group.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            📱 App required
          </span>
        )}
        {group.requires_signup && !group.requires_app && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            ✍️ Sign up required
          </span>
        )}
      </div>

      {/* Coupon code */}
      {group.coupon_code && (
        <div className="flex items-center gap-2 mb-2">
          <code className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-mono font-bold flex-1 truncate">
            {group.coupon_code}
          </code>
          <button
            onClick={() => handleCopyCode(group.coupon_code!)}
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      )}

      {/* Location info */}
      <div className="mt-auto">
        {/* 2C: Show location count instead of confidence dots */}
        {hasLocation && group.nearestDistance !== null ? (
          <div className="mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mr-2 ${getDistBadgeClass(group.nearestDistance)}`}>
              📍 {formatDist(group.nearestDistance)}
            </span>
            {group.nearestLocation?.address && (
              <span className="text-xs text-gray-400 truncate">{group.nearestLocation.address}</span>
            )}
          </div>
        ) : (
          <div className="mb-2">
            <span className="text-xs text-gray-500">
              📍 {group.locations.length} location{group.locations.length !== 1 ? 's' : ''}{cityName ? ` in ${cityName}` : ''}
            </span>
          </div>
        )}

        {/* Expand/collapse locations */}
        {group.locations.length > 1 && (
          <button
            onClick={() => setShowLocations(!showLocations)}
            className="w-full text-left text-xs text-blue-600 hover:text-blue-800 font-medium mb-2 flex items-center gap-1"
          >
            {showLocations ? '▲' : '▼'} {showLocations ? 'Hide' : 'Show all'} {group.locations.length} locations
            {hasLocation && <span className="text-gray-400 font-normal">· sorted by distance</span>}
          </button>
        )}

        {/* Location list (expanded) */}
        {showLocations && (
          <div className="border border-gray-100 rounded-lg overflow-hidden mb-2 max-h-48 overflow-y-auto">
            {sortedLocations.map((loc, i) => {
              const dist = hasLocation ? distanceMiles(userLat!, userLng!, loc.lat, loc.lng) : null;
              return (
                <div key={loc.deal_id} className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="text-gray-600 truncate flex-1 mr-2">{loc.address || 'Address not available'}</span>
                  {dist !== null && (
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-medium ${getDistBadgeClass(dist)}`}>
                      {formatDist(dist)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: location count + CTA + report link */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {/* 2C: Location count + updated date instead of confidence dots */}
          <span className="text-xs text-gray-400">
            {group.locations.length} location{group.locations.length !== 1 ? 's' : ''}
          </span>
          {updatedAt && (
            <span className="text-xs text-gray-300" title={`Data updated ${updatedAt}`}>
              · {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 2G: Report expired deal */}
          <button
            onClick={handleReport}
            title="Report expired or incorrect deal"
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
          >
            ⚑ Report
          </button>
          <a
            href={group.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white bg-blue-600 hover:bg-blue-700 font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            Get deal →
          </a>
        </div>
      </div>
    </div>
  );
}
