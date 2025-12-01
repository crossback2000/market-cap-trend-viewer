import { NextResponse } from 'next/server';
import { getLatestRanks } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const data = await getLatestRanks();
  return NextResponse.json({ data });
}
