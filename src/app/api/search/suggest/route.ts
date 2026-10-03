import { NextResponse, type NextRequest } from 'next/server';
import { suggest } from '@/lib/data/search';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const items = await suggest(q);
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' } });
}
