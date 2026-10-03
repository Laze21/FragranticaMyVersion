import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const revalidate = 3600;

/** Lightweight note list for pickers (perceived-note voting, filters). */
export async function GET() {
  const notes = await sql<{ slug: string; name: string; family: string; hue: string }>('select slug, name, family, hue from public.notes order by name');
  return NextResponse.json({ notes: notes.map((n) => ({ ...n, listed: false })) });
}
