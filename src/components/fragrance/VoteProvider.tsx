'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { clearRating, getMyFragranceState, rate, voteCharacter, votePerceived, votePerformance, voteWear, type MyFragranceState } from '@/app/actions/community';
import { DIMENSIONS, DIMENSION_META, LONGEVITY_BUCKETS, PROJECTION_LEVELS, WEAR_CONTEXTS } from '@/lib/scent/vocab';
import styles from './VoteProvider.module.css';

export type VoteKind = 'perceived' | 'performance' | 'wear' | 'rating' | 'character';
interface NoteOption {
  slug: string;
  name: string;
  family: string;
  hue: string;
  listed: boolean;
}

interface Ctx {
  open: (k: VoteKind) => void;
  mine: MyFragranceState | null;
  loading: boolean;
}
const VoteCtx = createContext<Ctx>({ open: () => {}, mine: null, loading: true });
export const useVotes = () => useContext(VoteCtx);

export function VoteProvider({ slug, name, notes, children }: { slug: string; name: string; notes: NoteOption[]; children: React.ReactNode }) {
  const { viewer, loaded } = useViewer();
  const router = useRouter();
  const path = usePathname();
  const [mine, setMine] = useState<MyFragranceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<VoteKind | null>(null);

  const reload = useCallback(async () => {
    if (!viewer) {
      setMine(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMine(await getMyFragranceState(slug));
    } finally {
      setLoading(false);
    }
  }, [viewer, slug]);

  useEffect(() => {
    if (loaded) void reload();
  }, [loaded, reload]);

  const open = useCallback(
    (k: VoteKind) => {
      if (!viewer) {
        router.push(`/sign-in?next=${encodeURIComponent(path)}`);
        return;
      }
      setSheet(k);
    },
    [viewer, router, path],
  );

  const done = async (msg: string) => {
    setSheet(null);
    toast(msg);
    await reload();
    router.refresh();
  };

  const value = useMemo(() => ({ open, mine, loading }), [open, mine, loading]);
  return (
    <VoteCtx.Provider value={value}>
      {children}
      {sheet === 'perceived' && <PerceivedSheet slug={slug} name={name} notes={notes} initial={mine?.perceived ?? []} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'performance' && <PerformanceSheet slug={slug} name={name} initial={mine?.performance ?? null} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'wear' && <WearSheet slug={slug} name={name} initial={mine?.wear ?? {}} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'rating' && <RatingSheet slug={slug} name={name} initial={mine?.rating ?? null} onClose={() => setSheet(null)} onDone={done} />}
      {sheet === 'character' && <CharacterSheet slug={slug} name={name} initial={mine?.character ?? {}} onClose={() => setSheet(null)} onDone={done} />}
    </VoteCtx.Provider>
  );
}

interface SheetProps<T> {
  slug: string;
  name: string;
  initial: T;
  onClose: () => void;
  onDone: (msg: string) => Promise<void>;
}

function SaveBar({ pending, onSave, onClose, label = 'Save' }: { pending: boolean; onSave: () => void; onClose: () => void; label?: string }) {
  return (
    <>
      <button type="button" className="btn btn--quiet" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="btn" onClick={onSave} disabled={pending}>
        {pending ? 'Saving…' : label}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
function PerceivedSheet({ slug, name, notes, initial, onClose, onDone }: SheetProps<string[]> & { notes: NoteOption[] }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [q, setQ] = useState('');
  const [pending, start] = useTransition();
  const [allNotes, setAllNotes] = useState<NoteOption[] | null>(null);

  useEffect(() => {
    if (q.length < 2 || allNotes) return;
    void fetch('/api/notes').then(async (r) => setAllNotes(((await r.json()) as { notes: NoteOption[] }).notes));
  }, [q, allNotes]);

  const toggle = (s: string) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length >= 15 ? p : [...p, s]));
  const pool = q.length >= 2 ? (allNotes ?? notes).filter((n) => n.name.toLowerCase().includes(q.toLowerCase())) : notes;
  const save = () =>
    start(async () => {
      const res = await votePerceived(slug, picked);
      if (!res.ok) return toast(res.error, 'error');
      await onDone(picked.length ? `Thanks. Your ${picked.length} notes are counted.` : 'Your note votes were cleared.');
    });

  return (
    <Sheet
      open
      onClose={onClose}
      title={`What do you smell in ${name}?`}
      description="Pick what you notice, not what the box says. Descriptors like “soapy” or “metallic” count."
      footer={<SaveBar pending={pending} onSave={save} onClose={onClose} />}
      wide
    >
      <label className={styles.search}>
        <span className="visually-hidden">Find another note</span>
        <input className="input" placeholder="Find another note: try “metallic” or “salt”" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className={styles.chips} role="group" aria-label="Notes">
        {pool.slice(0, 60).map((n) => (
          <button key={n.slug} type="button" className="chip" aria-pressed={picked.includes(n.slug)} onClick={() => toggle(n.slug)}>
            <i className={styles.dot} style={{ background: n.hue }} aria-hidden />
            {n.name}
            {n.listed && <span className={styles.listed}>listed</span>}
          </button>
        ))}
        {!pool.length && <p className="t-meta">No note by that name. Try a simpler word.</p>}
      </div>
      <p className="t-meta" aria-live="polite">
        {picked.length} picked{picked.length >= 15 ? ' (that’s the maximum)' : ''}
      </p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
function PerformanceSheet({ slug, name, initial, onClose, onDone }: SheetProps<MyFragranceState['performance']>) {
  const [lon, setLon] = useState<string | null>(initial?.longevity ?? null);
  const [p0, setP0] = useState<number | null>(initial?.projectionOpening ?? null);
  const [p1, setP1] = useState<number | null>(initial?.projectionLater ?? null);
  const [sprays, setSprays] = useState<number>(3);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await votePerformance(slug, { longevity: lon, projectionOpening: p0, projectionLater: p1, sprays });
      if (!res.ok) return toast(res.error, 'error');
      await onDone('Thanks. Your performance notes are counted.');
    });
  const Radio = ({ label, value, current, set }: { label: string; value: number | string; current: number | string | null; set: (v: never) => void }) => (
    <button type="button" className="chip" role="radio" aria-checked={current === value} onClick={() => set(value as never)}>
      {label}
    </button>
  );
  return (
    <Sheet open onClose={onClose} title={`How did ${name} perform on you?`} description="Your skin, your climate. Every answer helps the range get more honest." footer={<SaveBar pending={pending} onSave={save} onClose={onClose} />}>
      <fieldset className={styles.fieldset}>
        <legend>How long could you smell it?</legend>
        <div className={styles.chips} role="radiogroup">
          {LONGEVITY_BUCKETS.map((b) => (
            <Radio key={b.key} label={b.label} value={b.key} current={lon} set={setLon as (v: never) => void} />
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>In the first hour, who could smell it?</legend>
        <div className={styles.chips} role="radiogroup">
          {PROJECTION_LEVELS.map((l) => (
            <Radio key={l.value} label={`${l.label}: ${l.hint}`} value={l.value} current={p0} set={setP0 as (v: never) => void} />
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>And three hours later?</legend>
        <div className={styles.chips} role="radiogroup">
          {PROJECTION_LEVELS.map((l) => (
            <Radio key={l.value} label={l.label} value={l.value} current={p1} set={setP1 as (v: never) => void} />
          ))}
        </div>
      </fieldset>
      <div className={styles.fieldset}>
        <label htmlFor="sprays" className="t-sub">
          Sprays you used
        </label>
        <div className={styles.stepper}>
          <button type="button" className="btn btn--quiet btn--small" aria-label="Fewer sprays" onClick={() => setSprays((s) => Math.max(1, s - 1))}>
            −
          </button>
          <output id="sprays" className="t-figure" aria-live="polite">
            {sprays}
          </output>
          <button type="button" className="btn btn--quiet btn--small" aria-label="More sprays" onClick={() => setSprays((s) => Math.min(20, s + 1))}>
            +
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
function WearSheet({ slug, name, initial, onClose, onDone }: SheetProps<Record<string, boolean>>) {
  const [fits, setFits] = useState<Record<string, boolean | null>>(initial);
  const [pending, start] = useTransition();
  const groups = ['season', 'time', 'weather', 'occasion'] as const;
  const titles = { season: 'Seasons', time: 'Time of day', weather: 'Weather', occasion: 'Occasions' };
  const save = () =>
    start(async () => {
      const res = await voteWear(slug, fits);
      if (!res.ok) return toast(res.error, 'error');
      await onDone('Thanks. Counted.');
    });
  return (
    <Sheet open onClose={onClose} title={`When would you wear ${name}?`} description="Tap once for “yes, it fits”, twice for “no”, three times to skip." footer={<SaveBar pending={pending} onSave={save} onClose={onClose} />}>
      {groups.map((g) => (
        <fieldset key={g} className={styles.fieldset}>
          <legend>{titles[g]}</legend>
          <div className={styles.chips}>
            {WEAR_CONTEXTS.filter((c) => c.grp === g).map((c) => {
              const v = fits[c.key];
              return (
                <button
                  key={c.key}
                  type="button"
                  className={`chip ${v === false ? 'chip--exclude' : ''}`}
                  data-on={v === undefined || v === null ? undefined : 'true'}
                  aria-label={`${c.label}: ${v === true ? 'fits' : v === false ? 'does not fit' : 'no answer'}`}
                  onClick={() => setFits((f) => ({ ...f, [c.key]: v === true ? false : v === false ? null : true }))}
                >
                  {v === true ? '✓ ' : v === false ? '✕ ' : ''}
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
const SUBS = [
  { key: 'scent', label: 'Scent', hint: 'How much you like the smell itself' },
  { key: 'performance', label: 'Performance', hint: 'Happy with how long and how far it goes?' },
  { key: 'value', label: 'Value', hint: 'Worth the price?' },
  { key: 'originality', label: 'Originality', hint: 'Have you smelled this before?' },
] as const;

export function ScoreRow({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className={styles.score} role="radiogroup" aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 10`} data-filled={value !== null && n <= value ? 'true' : undefined} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

function RatingSheet({ slug, name, initial, onClose, onDone }: SheetProps<Record<string, number | null> | null>) {
  const [r, setR] = useState<Record<string, number | null>>({ overall: null, scent: null, performance: null, value: null, originality: null, ...(initial ?? {}) });
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      if (!r.overall) return toast('Pick an overall score first.', 'error');
      const res = await rate(slug, { overall: r.overall, scent: r.scent, performance: r.performance, value: r.value, originality: r.originality });
      if (!res.ok) return toast(res.error, 'error');
      await onDone(`Rated ${r.overall}/10.`);
    });
  const remove = () =>
    start(async () => {
      const res = await clearRating(slug);
      if (!res.ok) return toast(res.error, 'error');
      await onDone('Rating removed.');
    });
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Rate ${name}`}
      description="Overall is required. The rest are optional and stay separate, so a weak performer can still be a beautiful smell."
      footer={
        <>
          {initial?.overall && (
            <button type="button" className="btn btn--bare" onClick={remove} disabled={pending}>
              Remove rating
            </button>
          )}
          <SaveBar pending={pending} onSave={save} onClose={onClose} />
        </>
      }
    >
      <fieldset className={styles.fieldset}>
        <legend>Overall</legend>
        <ScoreRow label="Overall score" value={r.overall} onChange={(v) => setR((x) => ({ ...x, overall: v }))} />
      </fieldset>
      {SUBS.map((s) => (
        <fieldset key={s.key} className={styles.fieldset}>
          <legend>
            {s.label} <span className="t-meta">{s.hint}</span>
          </legend>
          <ScoreRow label={`${s.label} score`} value={r[s.key]} onChange={(v) => setR((x) => ({ ...x, [s.key]: v }))} />
        </fieldset>
      ))}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
function CharacterSheet({ slug, name, initial, onClose, onDone }: SheetProps<Record<string, number>>) {
  const [v, setV] = useState<Record<string, number>>(initial);
  const [pending, start] = useTransition();
  const levels = ['None', 'A little', 'Clearly', 'Dominant'];
  const save = () =>
    start(async () => {
      const res = await voteCharacter(slug, v);
      if (!res.ok) return toast(res.error, 'error');
      await onDone('Thanks. The Trail will shift as votes come in.');
    });
  return (
    <Sheet open onClose={onClose} title={`How does ${name} read to you?`} description="Rate each character. Skip any you’re unsure about." footer={<SaveBar pending={pending} onSave={save} onClose={onClose} />} wide>
      <div className={styles.charGrid}>
        {DIMENSIONS.map((d) => (
          <fieldset key={d} className={styles.charRow}>
            <legend>
              <i className={styles.dot} style={{ background: DIMENSION_META[d].hue }} aria-hidden /> {DIMENSION_META[d].label}
              <span className="t-meta"> {DIMENSION_META[d].plain}</span>
            </legend>
            <div className={styles.seg} role="radiogroup" aria-label={DIMENSION_META[d].label}>
              {levels.map((l, i) => (
                <button key={l} type="button" role="radio" aria-checked={v[d] === i} onClick={() => setV((x) => ({ ...x, [d]: i }))}>
                  {l}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Sheet>
  );
}
