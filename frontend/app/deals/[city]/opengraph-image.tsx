import { ImageResponse } from 'next/og';

// Note: do NOT use 'edge' runtime here — lib/data.ts uses Node.js 'path' module
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Derive a human-readable city name from the slug (e.g. "new-york-ny" → "New York, NY")
function citySlugToName(slug: string): string {
  const parts = slug.split('-');
  // Last 2 chars are typically the state abbreviation (e.g. "ny", "ca")
  const statePart = parts[parts.length - 1];
  const cityParts = parts.slice(0, -1);
  const cityName = cityParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return `${cityName}, ${statePart.toUpperCase()}`;
}

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const cityDisplay = citySlugToName(city);

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
        <div style={{ fontSize: 72, marginBottom: 20 }}>🍔</div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            marginBottom: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          FreebieMe
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Free Food Deals
        </div>
        <div
          style={{
            fontSize: 40,
            color: 'rgba(255,255,255,0.85)',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          in {cityDisplay}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 32,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 22,
          }}
        >
          <span>🎂 Birthday Freebies</span>
          <span>📱 App Deals</span>
          <span>🎁 Sign Up Bonuses</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
