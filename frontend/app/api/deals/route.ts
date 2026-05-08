import { NextRequest, NextResponse } from 'next/server';
import { getAllDeals, getChain, loadDB } from '../../../lib/normalized-data';

// GET /api/deals
//   ?chain=mcdonalds      filter by chain slug
//   ?deal_type=birthday   filter by deal type
//   ?min_confidence=0.7   filter by minimum confidence
//
// Public read-only API over the normalized DB. ~6 KB typical response.

export const dynamic = 'force-static';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chain = searchParams.get('chain');
  const dealType = searchParams.get('deal_type');
  const minConf = parseFloat(searchParams.get('min_confidence') || '0');

  const db = loadDB();
  if (!db) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }

  let deals = getAllDeals();
  if (chain) {
    if (!getChain(chain)) {
      return NextResponse.json({ error: `Unknown chain: ${chain}` }, { status: 404 });
    }
    deals = deals.filter(d => d.chain_slug === chain);
  }
  if (dealType) deals = deals.filter(d => d.deal_type === dealType);
  if (minConf > 0) deals = deals.filter(d => d.confidence_score >= minConf);

  return NextResponse.json({
    schema_version: db.schema_version,
    generated_at: db.generated_at,
    count: deals.length,
    deals,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
