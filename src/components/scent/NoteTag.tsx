import Link from 'next/link';
import { Popover } from '@/components/ui/Popover';
import type { NoteRef } from '@/lib/data/types';
import styles from './NoteTag.module.css';

const KIND: Record<NoteRef['kind'], string> = {
  material: 'Note',
  accord: 'Accord (built from several materials)',
  descriptor: 'How people describe it',
};

/**
 * A note, drawn as a paper blotter strip whose tip is stained with the note's colour.
 * Tapping it explains the note in one breath; the note page has the rest.
 */
export function NoteTag({ note, meta, emphasis, flag }: { note: NoteRef; meta?: string; emphasis?: boolean; flag?: string }) {
  return (
    <Popover
      label={`About ${note.name}`}
      triggerClassName={styles.tag}
      trigger={
        <>
          <span className={styles.name} data-emphasis={emphasis || undefined}>
            {note.name}
          </span>
          {meta && <span className={styles.meta}>{meta}</span>}
          {flag && <span className={styles.flag}>{flag}</span>}
          <span className={styles.tip} style={{ ['--note' as string]: note.hue }} aria-hidden />
        </>
      }
    >
      <span className={styles.popKind}>{KIND[note.kind]}</span>
      <span className={styles.popName}>{note.name}</span>
      {note.smellsLike && <span className={styles.popBody}>{note.smellsLike}</span>}
      <Link className={styles.popLink} href={`/notes/${note.slug}`}>
        All about {note.name.toLowerCase()}
      </Link>
    </Popover>
  );
}
