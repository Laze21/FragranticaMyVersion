import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { sql } from '@/lib/db';
import styles from '../editorial.module.css';
import l from './lists.module.css';

export const metadata: Metadata = { title: 'Lists', description: 'Fragrance lists made by people who wear them.' };
export const revalidate = 300;

export default async function ListsPage() {
  const lists = await sql<{ slug: string; title: string; description: string; handle: string; display_name: string; n: string; posters: string[] }>(
    `select l.slug, l.title, l.description, p.handle, p.display_name, count(li.fragrance_id) n,
            array_remove(array_agg(a.url order by li.position), null) posters
       from public.lists l join public.profiles p on p.id = l.user_id
       left join public.list_items li on li.list_id = l.id
       left join public.fragrance_primary_image a on a.fragrance_id = li.fragrance_id
      where l.is_public and not p.is_private group by l.id, p.handle, p.display_name order by l.created_at desc`,
  );
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Lists</h1>
        <p className={styles.lede}>Shortlists, starter kits and rotations, made by people who actually wear the things on them.</p>
      </header>
      <ul role="list" className={l.grid}>
        {lists.map((x) => (
          <li key={x.slug}>
            <Link href={`/lists/${x.handle}/${x.slug}`} className={l.item}>
              <span className={l.fan} aria-hidden>
                {x.posters.slice(0, 5).map((p, i) => (
                  <span key={p} style={{ ['--i' as string]: i }}>
                    <Image src={p} alt="" fill sizes="70px" />
                  </span>
                ))}
              </span>
              <span className={l.title}>{x.title}</span>
              <span className={l.desc}>{x.description}</span>
              <span className="t-meta">
                {x.n} fragrances · {x.display_name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
