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
  birthday_only: 'Birthday month only',
};

export default function DealCard({ deal, userLat, userLng, updatedAt }: DealCardProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <article className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors overflow-hidden">
      {/* Card body — always visible, minimal */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium text-stone-500">{deal.location_name}</span>
              {distance !== null && (
                <span className="text-xs text-stone-400">
                  · {distance < 0.1 ? '< 0.1' : distance.toFixed(1)} mi
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-stone-900 leading-snug tracking-tight mb-2 line-clamp-2">
              {deal.value_summary || deal.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-stone-400">
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
              {deal.valid_until && (
                <>
                  <span className="text-stone-200">·</span>
                  <span className="text-orange-600 font-medium">
                    expires {new Date(deal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          </div>
          <span
            className="text-stone-300 text-xs flex-shrink-0 mt-1"
            aria-hidden
          >
            {open ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {/* Expanded details — only when opened */}
      {open && (
        <div className="px-5 pb-5 -mt-1 space-y-3 border-t border-stone-50 pt-4">
          {deal.description && deal.description !== deal.title && (
            <p className="text-sm text-stone-600 leading-relaxed">{deal.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <Tag>{DEAL_TYPE_LABELS[deal.deal_type] || deal.deal_type}</Tag>
            {deal.requires_app && <Tag>App required</Tag>}
            {deal.requires_signup && !deal.requires_app && <Tag>Sign up</Tag>}
            {deal.claim_type && CLAIM_HINT[deal.claim_type] && <Tag>{CLAIM_HINT[deal.claim_type]}</Tag>}
          </div>

          {deal.claim_steps && deal.claim_steps.length > 0 && (
            <ol className="text-sm text-stone-600 space-y-1.5 pl-5 list-decimal marker:text-stone-300">
              {deal.claim_steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}

          {deal.coupon_code && (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg font-mono font-medium truncate">
                {deal.coupon_code}
              </code>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopyCode(deal.coupon_code!); }}
                className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-2 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}

          {/* Action row — primary CTA + save */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href={deal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium py-3 rounded-xl transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Get it
              <span aria-hidden>→</span>
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nowSaved = toggleSavedDeal(deal.deal_id);
                setSaved(nowSaved);
              }}
              title={saved ? 'Saved' : 'Save for later'}
              className={`px-4 py-3 rounded-xl border transition-colors ${
                saved
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300'
              }`}
            >
              {saved ? '★' : '☆'}
            </button>
          </div>

          {updatedAt && (
            <p className="text-[10px] text-stone-300 text-center">
              Data refreshed {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
      {children}
    </span>
  );
}
