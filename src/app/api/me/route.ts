import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth/session';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ viewer: null, shelf: {} }, { headers: { 'Cache-Control': 'private, no-store' } });
  const rows = await sql<{ slug: string; status: string; is_favorite: boolean }>(
    `select f.slug, i.status, i.is_favorite from public.collection_items i
       join public.collections c on c.id = i.collection_id and c.kind = 'main'
       join public.fragrances f on f.id = i.fragrance_id
      where c.user_id = $1`,
    [viewer.id],
  );
  return NextResponse.json(
    {
      viewer: { id: viewer.id, handle: viewer.handle, displayName: viewer.displayName, role: viewer.role, avatarHue: viewer.avatarHue },
      shelf: Object.fromEntries(rows.map((r) => [r.slug, { status: r.status, favorite: r.is_favorite }])),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
