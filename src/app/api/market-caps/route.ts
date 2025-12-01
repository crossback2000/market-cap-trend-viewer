import { NextResponse } from 'next/server';
import { getMarketCaps } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers');
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const tickers = tickersParam
    ?.split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const data = getMarketCaps({ tickers, from, to });
  return NextResponse.json({ data });
}
