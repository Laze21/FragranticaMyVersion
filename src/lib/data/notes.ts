import 'server-only';
import { cache } from 'react';
import { sql, sqlOne } from '@/lib/db';
import { getCards } from './catalog';
import type { FragranceCard, Vec } from './types';

export interface NoteDetail {
  id: string;
  slug: string;
  name: string;
  kind: 'material' | 'accord' | 'descriptor';
  family: string;
  aliases: string[];
  smellsLike: string | null;
  origin: string | null;
  contributes: string | null;
  synthetic: string | null;
  volatility: string | null;
  character: Vec;
  hue: string;
}

export const getNote = cache(async (slug: string): Promise<NoteDetail | null> => {
  const r = await sqlOne<Record<string, unknown>>('select * from public.notes where slug = $1', [slug]);
  if (!r) return null;
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    kind: r.kind as NoteDetail['kind'],
    family: r.family as string,
    aliases: (r.aliases as string[]) ?? [],
    smellsLike: (r.smells_like as string) ?? null,
    origin: (r.origin as string) ?? null,
    contributes: (r.contributes as string) ?? null,
    synthetic: (r.synthetic as string) ?? null,
    volatility: (r.volatility as string) ?? null,
    character: (r.character as Vec) ?? {},
    hue: (r.hue as string) ?? '#a79f93',
  };
});

/** Fragrances where the house lists the note. */
export async function fragrancesListing(noteId: string): Promise<FragranceCard[]> {
  return getCards(
    `exists (select 1 from public.fragrance_notes fn where fn.fragrance_id = f.id and fn.note_id = $1)`,
    [noteId],
    's.popularity desc nulls last',
    48,
  );
}

/** Fragrances where people strongly perceive the note, listed or not. */
export async function fragrancesPerceived(slug: string, noteId: string): Promise<Array<{ card: FragranceCard; share: number; listed: boolean }>> {
  const cards = await getCards(`coalesce((s.perceived ->> $1)::numeric, 0) >= 0.3`, [slug], '(s.perceived ->> $1)::numeric desc', 24);
  if (!cards.length) return [];
  const [shares, listed] = await Promise.all([
    sql<{ id: string; share: string }>(`select fragrance_id id, (perceived ->> $1) share from public.fragrance_stats where fragrance_id = any($2::uuid[])`, [slug, cards.map((c) => c.id)]),
    sql<{ fragrance_id: string }>(`select fragrance_id from public.fragrance_notes where note_id = $1`, [noteId]),
  ]);
  const listedSet = new Set(listed.map((l) => l.fragrance_id));
  const shareMap = new Map(shares.map((s) => [s.id, Number(s.share)]));
  return cards.map((card) => ({ card, share: shareMap.get(card.id) ?? 0, listed: listedSet.has(card.id) }));
}

/** Notes that most often share a pyramid with this one. */
export async function pairedNotes(noteId: string, limit = 10) {
  return sql<{ slug: string; name: string; hue: string; n: string }>(
    `select n.slug, n.name, n.hue, count(distinct b.fragrance_id) n
       from public.fragrance_notes a
       join public.fragrance_notes b on b.fragrance_id = a.fragrance_id and b.note_id <> a.note_id
       join public.notes n on n.id = b.note_id
      where a.note_id = $1 and n.kind <> 'descriptor'
      group by n.slug, n.name, n.hue
      order by n desc, n.name limit $2`,
    [noteId, limit],
  );
}

export const getNotesIndex = cache(async () => {
  return sql<{ slug: string; name: string; family: string; kind: string; hue: string; listed: string; smells_like: string | null }>(
    `select n.slug, n.name, n.family, n.kind, n.hue, n.smells_like,
            (select count(*) from public.fragrance_notes fn where fn.note_id = n.id) listed
       from public.notes n order by n.name`,
  );
});
