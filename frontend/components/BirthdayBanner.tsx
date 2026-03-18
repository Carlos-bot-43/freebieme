'use client';
import { useState, useEffect } from 'react';
import { getBirthdayMonth, setBirthdayMonth, isBirthdayMonth } from '../lib/birthdayMonth';
import EmailCapture from './EmailCapture';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BirthdayBanner() {
  const [isItNow, setIsItNow] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getBirthdayMonth();
    setIsItNow(isBirthdayMonth());
    // Show picker after 30 seconds on first visit if birthday not set
    if (!stored) {
      const timer = setTimeout(() => setShowPicker(true), 30000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSetMonth = (month: number) => {
    setBirthdayMonth(month);
    setIsItNow(new Date().getMonth() + 1 === month);
    setShowPicker(false);
  };

  // Don't render anything server-side (localStorage not available)
  if (!mounted) return null;
  if (dismissed) return null;

  // 🎂 Birthday month banner — it's your month!
  if (isItNow) return (
    <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
      <div>
        <p className="font-bold text-lg">🎂 Happy Birthday Month!</p>
        <p className="text-sm opacity-90">
          You qualify for birthday freebies at 20+ restaurant chains right now.
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <a
          href="/near-me"
          className="bg-white text-pink-700 text-sm font-bold px-3 py-2 rounded-xl whitespace-nowrap hover:bg-pink-50 transition-colors"
        >
          See deals →
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-white opacity-70 hover:opacity-100 text-lg leading-none"
          aria-label="Dismiss birthday banner"
        >
          ✕
        </button>
      </div>
    </div>
  );

  // Birthday month picker — shown after 30s if birthday not set
  if (showPicker) return (
    <div className="bg-white border border-pink-200 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800">🎂 What month is your birthday?</p>
        <button
          onClick={() => setShowPicker(false)}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Skip
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        We&apos;ll remind you about birthday freebies in your month — stored locally, never shared.
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {MONTHS.map((m, i) => (
          <button
            key={i}
            onClick={() => handleSetMonth(i + 1)}
            className="py-1.5 text-xs font-medium rounded-lg bg-gray-50 hover:bg-pink-50 hover:text-pink-700 transition-colors border border-gray-100 hover:border-pink-200"
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2 text-center">Get an email reminder before your birthday month?</p>
        <EmailCapture context="birthday_banner" />
      </div>
    </div>
  );

  return null;
}
