'use client';

export function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="h-3 bg-stone-100 rounded w-24" />
        <div className="h-3 bg-stone-100 rounded w-12" />
      </div>
      <div className="h-6 bg-stone-100 rounded w-4/5 mb-2" />
      <div className="h-4 bg-stone-100 rounded w-3/5 mb-5" />
      <div className="h-11 bg-stone-100 rounded-xl w-full mb-4" />
      <div className="flex gap-2 pt-4 border-t border-stone-50">
        <div className="h-2.5 bg-stone-100 rounded w-16" />
        <div className="h-2.5 bg-stone-100 rounded w-20" />
      </div>
    </div>
  );
}

export function DealGroupSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 bg-stone-100 rounded w-28" />
        <div className="h-3 bg-stone-100 rounded w-16" />
      </div>
      <div className="h-6 bg-stone-100 rounded w-4/5 mb-2" />
      <div className="h-4 bg-stone-100 rounded w-3/5 mb-5" />
      <div className="h-11 bg-stone-100 rounded-xl w-full mb-4" />
      <div className="flex gap-3 pt-4 border-t border-stone-50">
        <div className="h-2.5 bg-stone-100 rounded w-20" />
        <div className="h-2.5 bg-stone-100 rounded w-16" />
      </div>
    </div>
  );
}

export function DealListSkeleton() {
  return (
    <div>
      <div className="h-3 bg-stone-100 rounded w-48 mb-4 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealGroupSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
