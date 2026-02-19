// savedDeals.ts — Client-side bookmark persistence via localStorage
// No backend needed

const STORAGE_KEY = 'freebieme_saved_deals';

export function getSavedDealIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function toggleSavedDeal(dealId: string): boolean {
  const saved = getSavedDealIds();
  if (saved.has(dealId)) {
    saved.delete(dealId);
  } else {
    saved.add(dealId);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(saved)));
  return saved.has(dealId);
}

export function isDealSaved(dealId: string): boolean {
  return getSavedDealIds().has(dealId);
}
