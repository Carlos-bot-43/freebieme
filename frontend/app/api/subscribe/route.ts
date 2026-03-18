import { NextRequest, NextResponse } from 'next/server';

// Set RESEND_API_KEY and RESEND_AUDIENCE_ID in Vercel environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function POST(req: NextRequest) {
  try {
    const { email, birthdayMonth, context } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
      console.error('Missing RESEND env vars');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // Add contact to Resend audience
    const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        data: {
          birthday_month: birthdayMonth || null,
          source: context || 'homepage',
          signed_up_at: new Date().toISOString(),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Resend error:', body);
      // Don't fail silently on duplicate — Resend returns 409 for existing contacts
      if (res.status === 409) {
        return NextResponse.json({ ok: true }); // already subscribed, treat as success
      }
      throw new Error('Resend API error');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
