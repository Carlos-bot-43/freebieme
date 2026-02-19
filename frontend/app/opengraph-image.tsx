import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FreebieMe — Free Food Deals Near You';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 24 }}>🍔</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          FreebieMe
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          Free Food Deals Near You
        </div>
        <div
          style={{
            display: 'flex',
            gap: 40,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 24,
          }}
        >
          <span>🎂 Birthday Freebies</span>
          <span>📱 App Deals</span>
          <span>🎁 Sign Up Bonuses</span>
        </div>
        <div
          style={{
            marginTop: 48,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 18,
          }}
        >
          freebieme.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
