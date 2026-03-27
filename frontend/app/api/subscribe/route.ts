import { NextRequest, NextResponse } from 'next/server';

// Set RESEND_API_KEY and RESEND_AUDIENCE_ID in Vercel environment variables
// Without them, signups are logged to console only (graceful fallback)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email;
    const birthdayMonth = body.birthdayMonth ?? body.birthday_month ?? null;
    const context = body.context ?? 'homepage';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // If Resend is not configured, log and return success (graceful fallback)
    if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
      console.log('[subscribe] No email provider configured. Logging signup:', {
        email,
        birthdayMonth,
        context,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true });
    }

    // Add contact to Resend audience
    const res = await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
        data: {
          birthday_month: birthdayMonth || null,
          source: context,
          signed_up_at: new Date().toISOString(),
        },
      }),
    });

    if (!res.ok) {
      const resBody = await res.text();
      console.error('[subscribe] Resend error:', resBody);
      // 409 = already subscribed — treat as success
      if (res.status === 409) {
        return NextResponse.json({ ok: true });
      }
      throw new Error('Resend API error');
    }

    console.log('[subscribe] Subscribed:', email, 'month:', birthdayMonth, 'context:', context);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[subscribe] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
