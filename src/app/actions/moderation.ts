'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getViewer, requireModerator } from '@/lib/auth/session';
import { getDb, sql, sqlOne } from '@/lib/db';
import { refreshFragranceStats } from '@/lib/data/stats';

export interface ContributeState {
  error?: string;
  duplicate?: { slug: string; name: string; brand: string } | null;
}

const KINDS = ['new_fragrance', 'correction', 'new_concentration', 'perfumer_attribution', 'official_notes', 'image'];
const CORRECTABLE = ['release_year', 'concentration', 'status', 'discontinued_year', 'perfumers', 'notes', 'name', 'other'];

export async function submitContribution(_prev: ContributeState, form: FormData): Promise<ContributeState> {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in?next=/contribute');
  const kind = String(form.get('kind'));
  if (!KINDS.includes(kind)) return { error: 'Pick what you’re suggesting.' };
  const sourceUrl = String(form.get('sourceUrl') ?? '').trim();
  const attest = form.get('attest') === 'on';
  const details = String(form.get('details') ?? '').trim().slice(0, 4000);
  if (!attest) return { error: 'Please confirm this isn’t copied from another fragrance database.' };
  if (sourceUrl && !/^https?:\/\/\S+\.\S+/.test(sourceUrl)) return { error: 'The source should be a full link starting with https://' };
  if (['official_notes', 'new_fragrance', 'perfumer_attribution', 'new_concentration'].includes(kind) && !sourceUrl)
    return { error: 'Official facts need a source: the house’s page, a press release or a photo of the box.' };
  if (/fragrantica\.|parfumo\.|basenotes\./i.test(sourceUrl)) return { error: 'We can’t accept other fragrance databases as sources. Please link the house’s own page or packaging.' };

  let targetId: string | null = null;
  const targetSlug = String(form.get('fragrance') ?? '').trim();
  if (targetSlug) {
    const t = await sqlOne<{ id: string }>('select id from public.fragrances where slug = $1', [targetSlug]);
    targetId = t?.id ?? null;
  }
  const payload: Record<string, unknown> = { details };
  if (kind === 'new_fragrance') {
    payload.name = String(form.get('name') ?? '').trim().slice(0, 140);
    payload.house = String(form.get('house') ?? '').trim().slice(0, 140);
    payload.year = Number(form.get('year')) || null;
    payload.concentration = String(form.get('concentration') ?? '') || null;
    payload.notes = String(form.get('notes') ?? '').trim().slice(0, 1000);
    if (!payload.name || !payload.house) return { error: 'Add the fragrance name and its house.' };
  } else {
    if (!targetId) return { error: 'Pick which fragrance this is about.' };
    if (kind === 'correction') {
      const field = String(form.get('field') ?? 'other');
      payload.field = CORRECTABLE.includes(field) ? field : 'other';
      payload.value = String(form.get('value') ?? '').trim().slice(0, 500);
      if (!payload.value) return { error: 'What should it say instead?' };
    }
    if (kind === 'official_notes') payload.notes = String(form.get('notes') ?? '').trim().slice(0, 1000);
  }

  // Duplicate detection: is this "new" fragrance already here under a similar name?
  let duplicate: ContributeState['duplicate'] = null;
  if (kind === 'new_fragrance') {
    const d = await sqlOne<{ slug: string; name: string; brand: string; id: string; sim: number }>(
      `select f.id, f.slug, f.name, b.name brand,
              extensions.similarity(public.immutable_unaccent(lower(f.name || ' ' || b.name)), public.immutable_unaccent(lower($1))) sim
         from public.fragrances f join public.brands b on b.id = f.brand_id
        order by sim desc limit 1`,
      [`${payload.name} ${payload.house}`],
    );
    if (d && Number(d.sim) > 0.55) {
      duplicate = { slug: d.slug, name: d.name, brand: d.brand };
      if (form.get('confirmNotDuplicate') !== 'on') return { duplicate, error: 'This looks like it might already be here. Tick the box below if it’s really different.' };
      targetId = d.id;
    }
  }

  await sql(
    `insert into public.submissions (user_id, kind, target_fragrance_id, payload, source_url, evidence_url, attestation, duplicate_of)
     values ($1, $2, $3, $4, $5, $6, true, $7)`,
    [viewer.id, kind, kind === 'new_fragrance' ? null : targetId, JSON.stringify(payload), sourceUrl || null, String(form.get('evidenceUrl') ?? '') || null, duplicate ? targetId : null],
  );
  redirect('/contribute?sent=1');
}

export async function decideSubmission(id: string, decision: 'approved' | 'rejected' | 'needs_info', note: string) {
  const mod = await requireModerator();
  const s = await sqlOne<Record<string, unknown>>('select * from public.submissions where id = $1', [id]);
  if (!s || s.status !== 'pending') return { ok: false, error: 'Already handled.' };
  const db = await getDb();
  await db.tx(async (q) => {
    await q.query(`update public.submissions set status = $2, reviewer_id = $3, reviewer_note = $4, decided_at = now() where id = $1`, [id, decision, mod.id, note || null]);
    const payload = s.payload as Record<string, string>;
    if (decision === 'approved' && s.kind === 'correction' && s.target_fragrance_id) {
      const field = payload.field;
      const apply: Record<string, (v: string) => unknown> = {
        release_year: (v) => (/^\d{4}$/.test(v) ? Number(v) : undefined),
        discontinued_year: (v) => (/^\d{4}$/.test(v) ? Number(v) : undefined),
        concentration: (v) => (['cologne', 'edc', 'edt', 'edp', 'parfum', 'extrait', 'oil', 'body_mist'].includes(v) ? v : undefined),
        status: (v) => (['current', 'discontinued', 'limited', 'reformulated', 'upcoming'].includes(v) ? v : undefined),
      };
      const value = apply[field]?.(payload.value.trim().toLowerCase());
      if (value !== undefined) {
        const [old] = await q.query<Record<string, unknown>>(`select ${field} as v from public.fragrances where id = $1`, [s.target_fragrance_id]);
        await q.query(`update public.fragrances set ${field} = $2 where id = $1`, [s.target_fragrance_id, value]);
        await q.query(
          `insert into public.change_log (entity_type, entity_id, field, old_value, new_value, changed_by, submission_id, reason) values ('fragrance', $1, $2, $3, $4, $5, $6, $7)`,
          [s.target_fragrance_id, field, JSON.stringify(old?.v ?? null), JSON.stringify(value), mod.id, id, note || 'Community correction with source'],
        );
      }
    }
    await q.query(
      `insert into public.moderation_actions (moderator_id, action, target_type, target_id, reason, submission_id) values ($1, $2, 'fragrance', $3, $4, $5)`,
      [mod.id, decision === 'approved' ? 'approve' : 'reject', s.target_fragrance_id ?? id, note || null, id],
    );
  });
  revalidatePath('/admin');
  return { ok: true };
}

export async function handleReport(id: string, action: 'hide' | 'dismiss') {
  const mod = await requireModerator();
  const r = await sqlOne<{ target_type: string; target_id: string; reason: string }>('select target_type, target_id, reason from public.reports where id = $1', [id]);
  if (!r) return { ok: false };
  const db = await getDb();
  await db.tx(async (q) => {
    if (action === 'hide' && r.target_type === 'review') await q.query(`update public.reviews set status = 'hidden' where id = $1`, [r.target_id]);
    if (action === 'hide' && r.target_type === 'comment') await q.query(`update public.review_comments set status = 'hidden' where id = $1`, [r.target_id]);
    await q.query(`update public.reports set status = $2, handled_by = $3, handled_at = now() where id = $1`, [id, action === 'hide' ? 'actioned' : 'dismissed', mod.id]);
    if (action === 'hide')
      await q.query(`insert into public.moderation_actions (moderator_id, action, target_type, target_id, reason, report_id) values ($1, 'hide', $2, $3, $4, $5)`, [
        mod.id,
        r.target_type,
        r.target_id,
        r.reason.replace(/_/g, ' '),
        id,
      ]);
  });
  if (action === 'hide' && r.target_type === 'review') {
    const f = await sqlOne<{ fragrance_id: string }>('select fragrance_id from public.reviews where id = $1', [r.target_id]);
    if (f) await refreshFragranceStats(db, f.fragrance_id);
  }
  revalidatePath('/admin');
  return { ok: true };
}
