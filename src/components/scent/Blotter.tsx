import { oklabLightness } from '@/lib/scent/trail';
import styles from './Blotter.module.css';

/**
 * The dipped blotter: a paper strip with the note's colour in the bottom 40%, the way a
 * mouillette looks after it has been in the bottle. `glyph` (6×18) sits at the left edge of a
 * note tag and replaces every small colour dot in the product; `strip` (16×48) is the index
 * glyph on /notes and the swatch beside a family name. Pale hues get a touch of ink in the tip
 * so the dip never disappears against the paper.
 */
export function Blotter({ hue, size = 'glyph', className, label }: { hue: string; size?: 'glyph' | 'strip'; className?: string; label?: string }) {
  const pale = /^#[0-9a-f]{6}$/i.test(hue) && oklabLightness(hue) > 0.85;
  return (
    <span
      className={[styles.blotter, size === 'strip' ? styles.strip : styles.glyph, className ?? ''].join(' ').trim()}
      style={{ ['--blotter-hue' as string]: hue }}
      data-pale={pale || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  );
}
