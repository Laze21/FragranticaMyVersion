import type { Metadata } from 'next';
import { getHousesIndex, type HouseEntry } from '@/lib/data/directory';
import { Entry } from '@/components/directory/Entry';
import styles from '../directory.module.css';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Houses',
  description: 'Every fragrance house in the catalogue, by kind: what each is known for and the bottles of theirs people own most.',
  alternates: { canonical: '/house' },
};

/* The order a reader expects: the names everyone knows first, the specialists after. */
const KINDS: Array<{ kind: string; label: string; short: string }> = [
  { kind: 'designer', label: 'Designer houses', short: 'Designer' },
  { kind: 'heritage', label: 'Heritage houses', short: 'Heritage' },
  { kind: 'niche', label: 'Niche houses', short: 'Niche' },
  { kind: 'indie', label: 'Independent houses', short: 'Independent' },
  { kind: 'regional', label: 'Middle Eastern houses', short: 'Middle Eastern' },
  { kind: 'mass', label: 'High-street brands', short: 'High street' },
];
const COUNTRY = new Intl.DisplayNames(['en'], { type: 'region' });

function facts(h: HouseEntry) {
  const place = [h.city, h.country ? COUNTRY.of(h.country) : null].filter(Boolean).join(', ');
  return [place, h.foundedYear ? `founded ${h.foundedYear}` : null, h.parentCompany ? `part of ${h.parentCompany}` : null].filter(Boolean).join(' · ');
}

export default async function HousesPage() {
  const houses = await getHousesIndex();
  const groups = KINDS.map((k) => ({ ...k, houses: houses.filter((h) => h.kind === k.kind) })).filter((g) => g.houses.length);
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={`t-display ${styles.title}`}>Houses</h1>
        <p className={styles.lede}>
          {houses.length} houses with work in the catalogue, the designer names beside the niche and independent labels. Each house page reads a
          signature from the character of what it has here, so you can see what a name tends to mean before you smell it.
        </p>
        <nav aria-label="Kinds of house" className={styles.jump}>
          {groups.map((g, i) => (
            <span key={g.kind}>
              <a href={`#${g.kind}`}>{g.short}</a>
              {i < groups.length - 1 ? <span aria-hidden="true">·</span> : null}
            </span>
          ))}
        </nav>
      </header>
      {groups.map((g) => (
        <section key={g.kind} id={g.kind} className={styles.group} aria-labelledby={`${g.kind}-h`}>
          <div className={styles.groupHead}>
            <h2 id={`${g.kind}-h`} className={styles.groupTitle}>
              {g.label}
            </h2>
            <span className={styles.groupCount}>{g.houses.length === 1 ? '1 house' : `${g.houses.length} houses`}</span>
          </div>
          <ul className={styles.list}>
            {g.houses.map((h) => (
              <Entry key={h.slug} href={`/house/${h.slug}`} name={h.name} facts={facts(h)} blurb={h.knownFor} count={h.count} work={h.work} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
