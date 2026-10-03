import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sql, sqlOne } from '@/lib/db';
import { getCardsByIds } from '@/lib/data/catalog';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { DemoFlag } from '@/components/ui/DemoFlag';
import styles from '../../../editorial.module.css';
import l from '../../lists.module.css';

export const revalidate = 300;

async function load(handle: string, slug: string) {
  const list = await sqlOne<Record<string, unknown>>(
    `select l.*, p.handle, p.display_name, p.is_private, p.is_demo as author_demo from public.lists l join public.profiles p on p.id = l.user_id
      where lower(p.handle) = lower($1) and l.slug = $2 and l.is_public`,
    [handle, slug],
  );
  if (!list || list.is_private) return null;
  const items = await sql<{ fragrance_id: string; note: string | null }>('select fragrance_id, note from public.list_items where list_id = $1 order by position', [list.id]);
  const cards = await getCardsByIds(items.map((i) => i.fragrance_id));
  return { list, items, cards };
}

export async function generateMetadata(props: PageProps<'/lists/[handle]/[slug]'>): Promise<Metadata> {
  const { handle, slug } = await props.params;
  const d = await load(handle, slug);
  if (!d) return { title: 'List not found' };
  return { title: String(d.list.title), description: String(d.list.description ?? ''), openGraph: { title: String(d.list.title) } };
}

export default async function ListPage(props: PageProps<'/lists/[handle]/[slug]'>) {
  const { handle, slug } = await props.params;
  const d = await load(handle, slug);
  if (!d) notFound();
  const notes = new Map(d.items.map((i) => [i.fragrance_id, i.note]));
  return (
    <article className={`page ${styles.page}`} style={{ maxWidth: 1180 }}>
      <header className={styles.head}>
        <p className={styles.crumbs}>
          <Link href="/lists">Lists</Link> · by <Link href={`/u/${d.list.handle}`}>{String(d.list.display_name)}</Link>{' '}
          {d.list.author_demo ? <DemoFlag label="Demo account" /> : null}
        </p>
        <h1 className={styles.title}>{String(d.list.title)}</h1>
        {d.list.description ? <p className={styles.lede}>{String(d.list.description)}</p> : null}
      </header>
      <ol role="list" className={l.grid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {d.cards.map((c, i) => (
          <li key={c.id}>
            <p className="t-meta" style={{ marginBottom: 6 }}>
              {i + 1}
            </p>
            <FragranceCard card={c} />
            {notes.get(c.id) && <p style={{ marginTop: 8, fontFamily: 'var(--font-serif)', fontSize: '1.02rem' }}>{notes.get(c.id)}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}
