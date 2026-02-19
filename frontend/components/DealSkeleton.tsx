'use client';

export function DealCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="flex gap-1.5 mb-3">
        <div className="h-5 bg-gray-100 rounded-full w-20" />
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-full mb-1" />
      <div className="h-3 bg-gray-100 rounded w-4/5" />
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <div className="h-3 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

// Improved skeleton — looks like a real DealGroupCard
export function DealGroupSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-1.5" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-48 mb-1" />
      <div className="h-3 bg-gray-100 rounded w-64 mb-3" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-gray-100 rounded-full w-24" />
        <div className="h-5 bg-gray-100 rounded-full w-20" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
        <div className="h-3 bg-gray-100 rounded w-28" />
        <div className="h-7 bg-gray-200 rounded-lg w-20" />
      </div>
    </div>
  );
}

export function DealListSkeleton() {
  return (
    <div>
      <div className="h-4 bg-gray-100 rounded w-48 mb-3 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealGroupSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
