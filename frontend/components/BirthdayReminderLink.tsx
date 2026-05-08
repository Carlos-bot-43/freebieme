'use client';

import { useEffect, useState } from 'react';
import EmailCapture from './EmailCapture';

// Subtle footer trigger that opens a slide-up sheet with the birthday email capture.
// Replaces the homepage banner clutter — kept minimal, gets out of the way.
export default function BirthdayReminderLink() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-stone-400 hover:text-stone-700 transition-colors"
      >
        Birthday reminders
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#FAF7F2] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 sm:p-8 shadow-xl border border-stone-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-2xl mb-2">🎂</div>
                <h3 className="text-xl font-semibold text-stone-900 tracking-tight">
                  Birthday reminders
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  We&rsquo;ll send the full list of free food you qualify for in your birthday month.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-700 transition-colors text-xl leading-none ml-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-5">
              <EmailCapture context="homepage" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
