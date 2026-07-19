import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight mb-3">
          Not found
        </h1>
        <p className="text-stone-500 mb-8">
          This city or page doesn&rsquo;t exist yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-full font-medium text-sm transition-colors"
        >
          Back to home
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
