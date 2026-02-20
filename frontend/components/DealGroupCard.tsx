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

const VALUE_SUMMARY_COLORS: Record<string, string> = {
  birthday: 'text-pink-700',
  signup_bonus: 'text-purple-700',
  app_deal: 'text-blue-700',
  happy_hour: 'text-amber-700',
  rewards_program: 'text-green-700',
  freebie: 'text-emerald-700',
  bogo: 'text-orange-700',
  discount: 'text-red-700',
};

// Claim type display config — answers the #1 hangry-user question instantly
const CLAIM_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  instant:          { label: '⚡ Use right now',    className: 'bg-green-100 text-green-800' },
  same_day_setup:   { label: '📲 ~10 min setup',    className: 'bg-yellow-100 text-yellow-800' },
  advance_required: { label: '📅 Setup in advance', className: 'bg-orange-100 text-orange-800' },
  birthday_only:    { label: '🎂 Birthday month',   className: 'bg-pink-100 text-pink-800' },
};

function formatHHTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Robust happy hour day parser — handles all known and future day string patterns
function isHappyHourActiveToday(dayStr: string): boolean {
  const todayIdx = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
  const s = dayStr.toLowerCase().trim();

  if (s.includes('every day') || s.includes('daily')) return true;
  if (s.includes('weekdays') || s.includes('weekday')) return todayIdx >= 1 && todayIdx <= 5;
  if (s.includes('weekends') || s.includes('weekend')) return todayIdx === 0 || todayIdx === 6;
  // Seasonal/select = unknown schedule → show as possibly active (don't hide)
  if (s.includes('select') || s.includes('seasonal')) return true;

  const DAY_IDX: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  };

  // Handle ranges like "Mon–Fri", "Mon-Fri", "Fri–Sun"
  const rangeMatch = s.match(/([a-z]{3})[\s\u2013\-]+([a-z]{3})/);
  if (rangeMatch) {
    const startDay = DAY_IDX[rangeMatch[1].slice(0, 3)];
    const endDay = DAY_IDX[rangeMatch[2].slice(0, 3)];
    if (startDay !== undefined && endDay !== undefined) {
      if (startDay <= endDay) {
        return todayIdx >= startDay && todayIdx <= endDay;
      } else {
        // Wraps (e.g. Fri–Sun covers Fri=5, Sat=6, Sun=0)
        return todayIdx >= startDay || todayIdx <= endDay;
      }
    }
  }

  // Single named day (e.g. "Friday", "Fri")
  for (const [name, idx] of Object.entries(DAY_IDX)) {
    if (s.startsWith(name)) return todayIdx === idx;
  }

  return true; // Unknown pattern → assume valid to avoid hiding real deals
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
  const [showSteps, setShowSteps] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Happy hour live status
  const [hhStatus, setHhStatus] = useState<'active' | 'upcoming' | 'closed' | null>(null);
  const [hhCountdown, setHhCountdown] = useState<string>('');

  // Use the first location's deal_id as the "group save" key
  const primaryDealId = group.locations[0]?.deal_id || group.group_id;

  useEffect(() => {
    setSaved(isDealSaved(primaryDealId));
  }, [primaryDealId]);

  // Time-aware happy hour status (updates every minute)
  useEffect(() => {
    if (!group.happy_hour_start || !group.happy_hour_end) return;

    const updateStatus = () => {
      const now = new Date();
      const [startH, startM] = group.happy_hour_start!.split(':').map(Number);
      const [endH, endM] = group.happy_hour_end!.split(':').map(Number);
      const dayStr = group.happy_hour_days || '';

      // Check if today is a valid day using robust parser
      const validToday = isHappyHourActiveToday(dayStr);

      if (!validToday) {
        setHhStatus('closed');
        setHhCountdown(`Next: ${dayStr} at ${formatHHTime(group.happy_hour_start!)}`);
        return;
      }

      const nowMins = now.getHours() * 60 + now.getMinutes();
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (nowMins >= startMins && nowMins < endMins) {
        setHhStatus('active');
        const remaining = endMins - nowMins;
        setHhCountdown(`Ends in ${Math.floor(remaining / 60)}h ${remaining % 60}m`);
      } else if (nowMins < startMins) {
        setHhStatus('upcoming');
        const wait = startMins - nowMins;
        setHhCountdown(`Starts in ${Math.floor(wait / 60)}h ${wait % 60}m`);
      } else {
        setHhStatus('closed');
        const nextDay = dayStr.includes('every') ? 'tomorrow' : `next ${dayStr.split('–')[0]}`;
        setHhCountdown(`Next: ${nextDay} at ${formatHHTime(group.happy_hour_start!)}`);
      }
    };

    updateStatus();
    const timer = setInterval(updateStatus, 60000);
    return () => clearInterval(timer);
  }, [group.happy_hour_start, group.happy_hour_end, group.happy_hour_days]);

  const typeLabel = DEAL_TYPE_LABELS[group.deal_type] || DEAL_TYPE_LABELS.other;
  const typeColor = DEAL_TYPE_COLORS[group.deal_type] || DEAL_TYPE_COLORS.other;
  const typeBorder = DEAL_TYPE_BORDER[group.deal_type] || DEAL_TYPE_BORDER.other;
  const claimConfig = group.claim_type ? CLAIM_TYPE_CONFIG[group.claim_type] : null;

  // "New This Month" badge — show if updatedAt is in the current calendar month
  const isNewThisMonth = (() => {
    if (!updatedAt) return false;
    const updated = new Date(updatedAt);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  })();

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

  // Social sharing
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

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${typeBorder} p-4 hover:shadow-md transition-shadow duration-200 flex flex-col`}>

      {/* Header: Chain name + deal type badge + claim type badge + save + share */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900 text-base leading-tight block">
            {group.location_name}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
              {typeLabel}
            </span>
            {isNewThisMonth && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                🆕 New
              </span>
            )}
            {claimConfig && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${claimConfig.className}`}>
                {claimConfig.label}
              </span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleShare}
            title="Share this deal"
            className="text-sm text-gray-300 hover:text-blue-500 transition-colors p-0.5"
          >
            {shared ? '✅' : '🔗'}
          </button>
          <button
            onClick={handleToggleSave}
            title={saved ? 'Remove bookmark' : 'Save deal'}
            className={`text-xl transition-colors ${saved ? 'text-yellow-500' : 'text-gray-200 hover:text-yellow-400'}`}
          >
            {saved ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Value summary — the most important line: what you actually get */}
      {group.value_summary && (
        <div className={`text-base font-bold mb-0.5 leading-tight ${VALUE_SUMMARY_COLORS[group.deal_type] || 'text-gray-900'}`}>
          {group.value_summary}
        </div>
      )}

      {/* Deal title — secondary context, shown only if different from value_summary */}
      {group.title && group.title !== group.value_summary && (
        <p className="text-xs text-gray-500 mb-1.5 leading-relaxed line-clamp-2">
          {group.title}
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

      {/* Happy hour live status banner */}
      {hhStatus && (
        <div className="mb-2">
          <div className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            hhStatus === 'active'   ? 'bg-green-50 text-green-800 border border-green-200' :
            hhStatus === 'upcoming' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                                      'bg-gray-50 text-gray-500 border border-gray-200'
          }`}>
            {hhStatus === 'active'   && `🟢 Happy Hour is ON now · ${hhCountdown}`}
            {hhStatus === 'upcoming' && `🟡 ${hhCountdown}`}
            {hhStatus === 'closed'   && `⚫ Happy hour is over for today · ${hhCountdown}`}
          </div>
          {/* Timezone disclaimer — only when active or upcoming */}
          {(hhStatus === 'active' || hhStatus === 'upcoming') && (
            <p className="text-xs text-gray-400 mt-0.5 pl-1">⏰ Times are local to each restaurant</p>
          )}
        </div>
      )}

      {/* Birthday advance warning — the most important trust signal */}
      {group.deal_type === 'birthday' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2">
          <p className="text-xs text-orange-800 font-medium">
            ⚠️ Register before your birthday month — you can&apos;t sign up and claim same day
          </p>
        </div>
      )}

      {/* Purchase requirement warning */}
      {group.requires_purchase && group.deal_type !== 'rewards_program' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
          <p className="text-xs text-amber-800">💳 Requires a purchase to redeem</p>
        </div>
      )}

      {/* Compact requirements summary */}
      <div className="text-xs text-gray-400 mb-2 flex flex-wrap gap-x-2">
        <span>{group.requires_app ? '📱 App required' : '🌐 No app needed'}</span>
        <span>·</span>
        <span>{group.requires_signup ? '✍️ Free signup' : '👋 Walk-in'}</span>
        {group.requires_purchase && (
          <>
            <span>·</span>
            <span>💳 With purchase</span>
          </>
        )}
      </div>

      {/* How to Claim expandable section */}
      {group.claim_steps && group.claim_steps.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            {showSteps ? '▲' : '▼'} How to claim
          </button>
          {showSteps && (
            <ol className="mt-2 space-y-1 pl-4">
              {group.claim_steps.map((step, i) => (
                <li key={i} className="text-xs text-gray-600 list-decimal leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

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

      {/* Footer: sourced date + report + CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
        <div className="text-xs text-gray-400">
          <span title="When we last collected deal data from official sources">
            Sourced {updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'recently'}
          </span>
          {' · '}
          <a
            href={`mailto:deals@freebieme.com?subject=Expired deal: ${encodeURIComponent(group.location_name + ' - ' + group.title)}&body=This deal appears to be expired or incorrect.%0A%0AChain: ${encodeURIComponent(group.location_name)}%0ADeal: ${encodeURIComponent(group.title)}%0APage: ${typeof window !== 'undefined' ? window.location.href : ''}`}
            className="hover:text-red-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            ⚑ Report
          </a>
        </div>
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
  );
}
