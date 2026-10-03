/** Warm umber: 5.8:1 for porcelain initials. Used when a person has not picked a hue. */
const DEFAULT_HUE = '#6d6150';

/** CIE lightness (0..1) of a hex colour; anything unparseable reads as dark. */
function lightness(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const y = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y) / 100;
}

/**
 * No uploaded photos in the prototype: a monogram on the person's chosen hue.
 * Profiles are about fragrance identity, not faces. A pale hue cannot carry porcelain initials,
 * so it draws ink initials on linen instead and keeps the hue as a ring.
 */
export function Avatar({ name, hue, size = 32 }: { name: string; hue: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const colour = hue ?? DEFAULT_HUE;
  const pale = lightness(colour) > 0.6;
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: pale ? 'var(--linen)' : colour,
        boxShadow: pale ? `inset 0 0 0 2px ${colour}` : undefined,
        color: pale ? 'var(--ink)' : 'var(--porcelain)',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: Math.max(12, Math.round(size * 0.38)),
        fontWeight: 600,
        fontStretch: '90%',
        letterSpacing: '0.02em',
        lineHeight: 1,
        flex: 'none',
      }}
    >
      {initials}
    </span>
  );
}
