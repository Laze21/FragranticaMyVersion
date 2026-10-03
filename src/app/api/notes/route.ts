import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const revalidate = 3600;

/**
 * Lightweight note list for pickers (perceived-note voting, filters). `listed` is false here
 * because it means "listed in this fragrance", which the picker fills in; `aliases` lets a
 * picker match "bergamot orange" or "oud" to the entry it means.
 */
export async function GET() {
  const notes = await sql<{
    slug: string;
    name: string;
    family: string;
    kind: string;
    hue: string;
    aliases: string[] | null;
  }>(
    "select slug, name, family, kind, hue, aliases from public.notes order by name",
  );
  return NextResponse.json({
    notes: notes.map((n) => ({
      ...n,
      aliases: n.aliases ?? [],
      listed: false,
    })),
  });
}
