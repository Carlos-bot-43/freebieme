'use client';
import { useState } from 'react';
import { getBirthdayMonth } from '../lib/birthdayMonth';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

interface EmailCaptureProps {
  context?: 'homepage' | 'city' | 'birthday_banner';
}

export default function EmailCapture({ context = 'homepage' }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const birthdayMonth = getBirthdayMonth(); // from localStorage — already set by BirthdayBanner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStep('submitting');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, birthdayMonth, context }),
      });
      if (!res.ok) throw new Error('Failed');
      setStep('success');
    } catch {
      setErrorMsg('Something went wrong. Try again.');
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-2">🎉</div>
        <p className="font-semibold text-gray-900">You&apos;re in!</p>
        <p className="text-sm text-gray-500 mt-1">
          {birthdayMonth
            ? `We'll remind you about birthday freebies in ${MONTHS[birthdayMonth - 1]}.`
            : "We'll send you deal alerts when new freebies drop."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          type="submit"
          disabled={step === 'submitting'}
          className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {step === 'submitting' ? '...' : 'Remind Me 🎂'}
        </button>
      </div>
      {birthdayMonth && (
        <p className="text-xs text-gray-400 text-center">
          You&apos;ll get a reminder before {MONTHS[birthdayMonth - 1]} with all your birthday freebies
        </p>
      )}
      {!birthdayMonth && (
        <p className="text-xs text-gray-400 text-center">
          Get notified when new free food deals drop near you
        </p>
      )}
      {step === 'error' && (
        <p className="text-xs text-red-500 text-center">{errorMsg}</p>
      )}
      <p className="text-xs text-gray-300 text-center">No spam. Unsubscribe anytime.</p>
    </form>
  );
}
