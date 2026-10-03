import type { Metadata } from 'next';
import { getNotesIndex } from '@/lib/data/notes';
import { NotesBrowser } from '@/components/scent/NotesBrowser';
import styles from './page.module.css';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Notes: what fragrance ingredients smell like',
  description: 'Every note explained in plain words: what it smells like, where it comes from, and where people notice it.',
  alternates: { canonical: '/notes' },
};

const ORDER = ['citrus', 'aromatic', 'green', 'marine', 'floral', 'fruity', 'spice', 'gourmand', 'tea', 'woody', 'resinous', 'earthy', 'musk', 'leather', 'smoky', 'mineral'];

export default async function NotesPage() {
  const notes = await getNotesIndex();
  const families = ORDER.map((fam) => ({ family: fam, notes: notes.filter((n) => n.family === fam) })).filter((g) => g.notes.length);
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Notes</h1>
        <p className={styles.lede}>
          A note list is a description, not an ingredient list. These pages explain each one in plain words, so “ambroxan” or “galbanum” stops
          being a mystery.
        </p>
      </header>
      <NotesBrowser
        families={families.map((g) => ({
          family: g.family,
          notes: g.notes.map((n) => ({ slug: n.slug, name: n.name, hue: n.hue, kind: n.kind, listed: Number(n.listed), smellsLike: n.smells_like })),
        }))}
      />
    </div>
  );
}
