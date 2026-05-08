'use client';

import { useState, useEffect } from 'react';
import { Deal, DEAL_TYPE_LABELS, distanceMiles } from '../lib/types';
import { confidenceBucket, freshnessLabel } from '../lib/normalized-types';
import { toggleSavedDeal, isDealSaved } from '../lib/savedDeals';

interface DealCardProps {
  deal: Deal;
  userLat?: number;
  userLng?: number;
  updatedAt?: string;
}

const TRUST_LABEL: Record<string, string> = {
  verified: 'Verified',
  likely: 'Likely',
  unverified: 'Unverified',
};

const CLAIM_HINT: Record<string, string> = {
  instant: 'Use right now',
  same_day_setup: 'Set up in minutes',
  advance_required: 'Plan ahead',
  birthday_only: 'Birthday only',
};

export default function DealCard({ deal, userLat, userLng, updatedAt }: DealCardProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isDealSaved(deal.deal_id));
  }, [deal.deal_id]);

  const distance =
    userLat && userLng && deal.lat && deal.lng
      ? distanceMiles(userLat, userLng, deal.lat, deal.lng)
      : null;

  const bucket = confidenceBucket(deal.confidence_score ?? 0);
  const fresh = freshnessLabel(deal.last_verified_at);
  const trustDot =
    bucket === 'verified' ? 'bg-emerald-500' : bucket === 'likely' ? 'bg-amber-400' : 'bg-stone-300';

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const headline = deal.value_summary || deal.title;
  const hasExtraDescription =
    deal.description && deal.description.trim() && deal.description !== deal.title && deal.description !== headline;
  const hasSteps = deal.claim_steps && deal.claim_steps.length > 0;

  // Tags shown subtly at the bottom — only what's *constraint-relevant*, not decorative.
  const tags: string[] = [];
  if (deal.requires_app) tags.push('App');
  else if (deal.requires_signup) tags.push('Sign up');
  if (deal.claim_type && CLAIM_HINT[deal.claim_type]) tags.push(CLAIM_HINT[deal.claim_type]);
  if (DEAL_TYPE_LABELS[deal.deal_type]) tags.push(DEAL_TYPE_LABELS[deal.deal_type]);

  return (
    <article className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors p-6">
      {/* ─── Brand row — chain prominent ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-stone-900 uppercase tracking-[0.16em]">
          {deal.location_name}
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          {distance !== null && (
            <span className="font-medium text-stone-500">
              {distance < 0.1 ? '< 0.1' : distance.toFixed(1)} mi
            </span>
          )}
          {deal.valid_until && (
            <>
              {distance !== null && <span className="text-stone-200">·</span>}
              <span className="text-orange-600 font-medium">
                ends {new Date(deal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ─── Hero: deal value (dominant) ──────────────────────────────── */}
      <h3 className="text-[22px] sm:text-2xl font-semibold text-stone-900 leading-[1.15] tracking-tight mb-1">
        {headline}
      </h3>
      {hasExtraDescription && (
        <p className="text-sm text-stone-500 leading-relaxed mb-4">{deal.description}</p>
      )}
      {!hasExtraDescription && <div className="mb-5" />}

      {/* ─── Coupon code (if present) ─────────────────────────────────── */}
      {deal.coupon_code && (
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg font-mono font-medium truncate">
            {deal.coupon_code}
          </code>
          <button
            onClick={() => handleCopyCode(deal.coupon_code!)}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {/* ─── Always-visible primary CTA ──────────────────────────────── */}
      <div className="flex items-center gap-2">
        <a
          href={deal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium py-3 rounded-xl transition-colors"
        >
          Get it
          <span aria-hidden>→</span>
        </a>
        <button
          onClick={() => {
            const nowSaved = toggleSavedDeal(deal.deal_id);
            setSaved(nowSaved);
          }}
          title={saved ? 'Saved' : 'Save for later'}
          aria-label={saved ? 'Remove from saved' : 'Save for later'}
          className={`px-4 py-3 rounded-xl border transition-colors ${
            saved
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300'
          }`}
        >
          {saved ? '★' : '☆'}
        </button>
      </div>

      {/* ─── Optional: how-to-claim toggle ────────────────────────────── */}
      {hasSteps && (
        <div className="mt-4">
          <button
            onClick={() => setShowSteps(s => !s)}
            className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            How to claim {showSteps ? '↑' : '↓'}
          </button>
          {showSteps && (
            <ol className="mt-3 text-sm text-stone-600 space-y-1.5 pl-5 list-decimal marker:text-stone-300">
              {deal.claim_steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </div>
      )}

      {/* ─── Subtle tag row (bottom) ──────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t border-stone-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${trustDot}`} />
          {TRUST_LABEL[bucket]}
        </span>
        {fresh && (
          <>
            <span className="text-stone-200">·</span>
            <span>checked {fresh}</span>
          </>
        )}
        {tags.map((t, i) => (
          <span key={t + i} className="inline-flex items-center">
            <span className="text-stone-200 mr-3">·</span>
            <span>{t}</span>
          </span>
        ))}
      </div>

      {updatedAt && (
        <p className="text-[10px] text-stone-300 mt-3">
          Data refreshed {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </article>
  );
}
