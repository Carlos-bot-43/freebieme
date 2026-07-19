'use client';

import { useState, useEffect } from 'react';
import { DealGroup, DEAL_TYPE_LABELS, distanceMiles } from '../lib/types';
import { toggleSavedDeal, isDealSaved } from '../lib/savedDeals';

const CLAIM_LABEL: Record<string, string> = {
  instant: 'Use right now',
  same_day_setup: 'Set up in minutes',
  advance_required: 'Plan ahead',
  birthday_only: 'Birthday only',
};

function formatHHTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return m === 0 ? `${hour} ${period}` : `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function isHappyHourActiveToday(dayStr: string): boolean {
  const todayIdx = new Date().getDay();
  const s = dayStr.toLowerCase().trim();

  if (s.includes('every day') || s.includes('daily')) return true;
  if (s.includes('weekdays') || s.includes('weekday')) return todayIdx >= 1 && todayIdx <= 5;
  if (s.includes('weekends') || s.includes('weekend')) return todayIdx === 0 || todayIdx === 6;
  if (s.includes('select') || s.includes('seasonal')) return true;

  const DAY_IDX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const rangeMatch = s.match(/([a-z]{3})[\s–\-]+([a-z]{3})/);
  if (rangeMatch) {
    const startDay = DAY_IDX[rangeMatch[1].slice(0, 3)];
    const endDay = DAY_IDX[rangeMatch[2].slice(0, 3)];
    if (startDay !== undefined && endDay !== undefined) {
      return startDay <= endDay
        ? todayIdx >= startDay && todayIdx <= endDay
        : todayIdx >= startDay || todayIdx <= endDay;
    }
  }
  for (const [name, idx] of Object.entries(DAY_IDX)) {
    if (s.startsWith(name)) return todayIdx === idx;
  }
  return true;
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

export default function DealGroupCard({ group, userLat, userLng, cityName, updatedAt }: DealGroupCardProps) {
  const [showLocations, setShowLocations] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const [hhStatus, setHhStatus] = useState<'active' | 'upcoming' | 'closed' | null>(null);
  const [hhCountdown, setHhCountdown] = useState<string>('');

  const primaryDealId = group.locations[0]?.deal_id || group.group_id;

  useEffect(() => {
    setSaved(isDealSaved(primaryDealId));
  }, [primaryDealId]);

  useEffect(() => {
    if (!group.happy_hour_start || !group.happy_hour_end) return;

    const updateStatus = () => {
      const now = new Date();
      const [startH, startM] = group.happy_hour_start!.split(':').map(Number);
      const [endH, endM] = group.happy_hour_end!.split(':').map(Number);
      const dayStr = group.happy_hour_days || '';
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

  const isNewThisMonth = (() => {
    if (!updatedAt) return false;
    const updated = new Date(updatedAt);
    const now = new Date();
    return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
  })();

  const hasLocation = !!(userLat && userLng);

  const sortedLocations = hasLocation
    ? [...group.locations].sort((a, b) => {
        const da = distanceMiles(userLat!, userLng!, a.lat, a.lng);
        const db = distanceMiles(userLat!, userLng!, b.lat, b.lng);
        return da - db;
      })
    : group.locations;

  const handleToggleSave = () => setSaved(toggleSavedDeal(primaryDealId));

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    const text = `${group.title} at ${group.location_name} — claim it free at FreebieMe`;
    const url = typeof window !== 'undefined' ? window.location.href : 'https://freebieme.vercel.app';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: group.title, text, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {}
    }
  };

  const headline = group.value_summary || group.title;
  const hasSubtitle = group.title && group.title !== headline;
  const hasSteps = group.claim_steps && group.claim_steps.length > 0;

  const tags: string[] = [];
  if (group.requires_app) tags.push('App');
  else if (group.requires_signup) tags.push('Sign up');
  if (group.requires_purchase) tags.push('With purchase');
  if (group.claim_type && CLAIM_LABEL[group.claim_type]) tags.push(CLAIM_LABEL[group.claim_type]);
  if (DEAL_TYPE_LABELS[group.deal_type]) tags.push(DEAL_TYPE_LABELS[group.deal_type]);
  if (isNewThisMonth) tags.push('New');

  return (
    <article className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-stone-900 uppercase tracking-[0.16em]">
          {group.location_name}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          {hasLocation && group.nearestDistance !== null && (
            <span className="font-medium text-stone-500">{formatDist(group.nearestDistance)}</span>
          )}
          {!hasLocation && (
            <span className="text-stone-400">
              {group.locations.length} loc{group.locations.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleShare}
            title="Share"
            className="text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Share"
          >
            {shared ? '✓' : '↗'}
          </button>
          <button
            onClick={handleToggleSave}
            title={saved ? 'Saved' : 'Save'}
            className={`text-base transition-colors ${saved ? 'text-amber-500' : 'text-stone-300 hover:text-stone-500'}`}
            aria-label={saved ? 'Remove from saved' : 'Save'}
          >
            {saved ? '★' : '☆'}
          </button>
        </div>
      </div>

      <h3 className="text-[22px] sm:text-2xl font-semibold text-stone-900 leading-[1.15] tracking-tight mb-1">
        {headline}
      </h3>
      {hasSubtitle && (
        <p className="text-sm text-stone-500 leading-relaxed mb-4 line-clamp-2">{group.title}</p>
      )}
      {!hasSubtitle && <div className="mb-5" />}

      {hhStatus && (
        <div className="mb-4">
          <div className={`rounded-xl px-3 py-2 text-xs font-medium border ${
            hhStatus === 'active'   ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
            hhStatus === 'upcoming' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                                      'bg-stone-50 text-stone-500 border-stone-100'
          }`}>
            {hhStatus === 'active'   && `On now · ${hhCountdown}`}
            {hhStatus === 'upcoming' && hhCountdown}
            {hhStatus === 'closed'   && `Closed · ${hhCountdown}`}
          </div>
        </div>
      )}

      {group.deal_type === 'birthday' && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mb-4">
          <p className="text-xs text-orange-800">
            Register <strong>before</strong> your birthday month — you can&rsquo;t sign up and claim same day.
          </p>
        </div>
      )}

      {group.coupon_code && (
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg font-mono font-medium truncate">
            {group.coupon_code}
          </code>
          <button
            onClick={() => handleCopyCode(group.coupon_code!)}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <a
        href={group.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium py-3 rounded-xl transition-colors"
      >
        Get it
        <span aria-hidden>→</span>
      </a>

      {(hasSteps || group.locations.length > 1) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
          {hasSteps && (
            <button
              onClick={() => setShowSteps(s => !s)}
              className="font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              How to claim {showSteps ? '↑' : '↓'}
            </button>
          )}
          {group.locations.length > 1 && (
            <button
              onClick={() => setShowLocations(s => !s)}
              className="font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              {showLocations ? 'Hide' : 'Show'} {group.locations.length} locations {showLocations ? '↑' : '↓'}
            </button>
          )}
        </div>
      )}

      {showSteps && hasSteps && (
        <ol className="mt-3 text-sm text-stone-600 space-y-1.5 pl-5 list-decimal marker:text-stone-300">
          {group.claim_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}

      {showLocations && (
        <div className="mt-3 border border-stone-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
          {sortedLocations.map((loc, i) => {
            const dist = hasLocation ? distanceMiles(userLat!, userLng!, loc.lat, loc.lng) : null;
            return (
              <div
                key={loc.deal_id}
                className={`flex items-center justify-between px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-stone-50/60' : 'bg-white'}`}
              >
                <span className="text-stone-600 truncate flex-1 mr-2">{loc.address || 'Address not available'}</span>
                {dist !== null && (
                  <span className="flex-shrink-0 text-stone-500 font-medium">{formatDist(dist)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-stone-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
        {hasLocation && group.nearestLocation?.address ? (
          <span className="text-stone-500 truncate max-w-[60%]">{group.nearestLocation.address}</span>
        ) : (
          !hasLocation && cityName && <span>{group.locations.length} location{group.locations.length !== 1 ? 's' : ''} in {cityName}</span>
        )}
        {tags.map((t, i) => (
          <span key={t + i} className="inline-flex items-center">
            {(hasLocation || cityName || i > 0) && <span className="text-stone-200 mr-3">·</span>}
            <span>{t}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-stone-300">
        <span>Sourced {updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'recently'}</span>
        <a
          href={`mailto:deals@freebieme.com?subject=Expired deal: ${encodeURIComponent(group.location_name + ' - ' + group.title)}`}
          className="hover:text-stone-500 transition-colors"
        >
          Report
        </a>
      </div>
    </article>
  );
}
