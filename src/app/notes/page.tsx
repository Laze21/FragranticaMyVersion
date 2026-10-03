import type { Metadata } from 'next';
import { getNotesIndex } from '@/lib/data/notes';
import { NotesBrowser, type FamilyGroup } from '@/components/scent/NotesBrowser';
import styles from './page.module.css';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Notes: what fragrance ingredients smell like',
  description: 'Every note explained in plain words: what it smells like, where it comes from, and where people notice it.',
  alternates: { canonical: '/notes' },
};

/* Families in the order a nose meets them: bright things first, the heavy base last. */
const FAMILIES: Array<{ family: string; label: string; short: string }> = [
  { family: 'citrus', label: 'Citrus', short: 'Citrus' },
  { family: 'aromatic', label: 'Aromatic herbs', short: 'Herbs' },
  { family: 'green', label: 'Green', short: 'Green' },
  { family: 'marine', label: 'Marine & watery', short: 'Marine' },
  { family: 'floral', label: 'Floral', short: 'Floral' },
  { family: 'fruity', label: 'Fruity', short: 'Fruity' },
  { family: 'spice', label: 'Spice', short: 'Spice' },
  { family: 'gourmand', label: 'Gourmand', short: 'Gourmand' },
  { family: 'tea', label: 'Tea', short: 'Tea' },
  { family: 'woody', label: 'Woods', short: 'Woods' },
  { family: 'resinous', label: 'Resins & amber', short: 'Resins' },
  { family: 'earthy', label: 'Earth & moss', short: 'Earth' },
  { family: 'musk', label: 'Musks & clean', short: 'Musks' },
  { family: 'leather', label: 'Leather & animalic', short: 'Leather' },
  { family: 'smoky', label: 'Smoke & tobacco', short: 'Smoke' },
  { family: 'mineral', label: 'Mineral', short: 'Mineral' },
];

export default async function NotesPage() {
  const notes = await getNotesIndex();
  const families: FamilyGroup[] = FAMILIES.map((f) => {
    const members = notes.filter((n) => n.family === f.family);
    // The family's swatch is dipped in its most-listed note: the colour a reader already associates with it.
    const lead = [...members].sort((a, b) => b.listed - a.listed || a.name.localeCompare(b.name))[0];
    return { ...f, hue: lead?.hue ?? '#a79f93', notes: members.map((n) => ({ slug: n.slug, name: n.name, hue: n.hue, kind: n.kind, listed: n.listed, smellsLike: n.smells_like })) };
  }).filter((g) => g.notes.length);
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={`t-display ${styles.title}`}>Notes</h1>
          <p className={`tnum ${styles.count}`}>{notes.length} notes</p>
        </div>
        <p className={styles.lede}>
          A note list is a description, not an ingredient list. Each note here is explained in plain words, so “ambroxan” or “galbanum” stops
          being a mystery.
        </p>
      </header>
      <NotesBrowser families={families} total={notes.length} />
    </div>
  );
}
