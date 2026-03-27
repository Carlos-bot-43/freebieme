'use client';
import { useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BirthdayReminderSignup() {
  const [email, setEmail] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    if (!birthdayMonth) return;

    setStatus('submitting');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          birthday_month: parseInt(birthdayMonth, 10),
          birthdayMonth: parseInt(birthdayMonth, 10),
          context: 'birthday_reminder_signup',
        }),
      });

      if (!res.ok) throw new Error('Failed');
      setStatus('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✓</div>
        <p className="font-semibold text-emerald-800">You&apos;re on the list!</p>
        <p className="text-sm text-emerald-600 mt-1">
          We&apos;ll remind you before your birthday with everything that&apos;s free for you.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Get your birthday freebies reminder
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        We&apos;ll remind you 2 weeks before your birthday with everything that&apos;s free for you
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="brs-month" className="sr-only">Birthday month</label>
          <select
            id="brs-month"
            value={birthdayMonth}
            onChange={(e) => setBirthdayMonth(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-gray-700"
          >
            <option value="" disabled>Your birthday month</option>
            {MONTHS.map((month, i) => (
              <option key={month} value={String(i + 1)}>{month}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="brs-email" className="sr-only">Email address</label>
          <input
            id="brs-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-60"
        >
          {status === 'submitting' ? 'Signing up...' : 'Remind Me'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-red-500 text-center">{errorMsg}</p>
        )}

        <p className="text-xs text-gray-400 text-center">No spam. Unsubscribe anytime.</p>
      </form>
    </div>
  );
}
