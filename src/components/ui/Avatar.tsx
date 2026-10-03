/**
 * No uploaded photos in the prototype: a monogram on the person's chosen hue.
 * Profiles are about fragrance identity, not faces.
 */
export function Avatar({ name, hue, size = 32 }: { name: string; hue: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: hue ?? '#8e7f6a',
        color: '#fbfaf7',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        fontStretch: '90%',
        letterSpacing: '0.02em',
        flex: 'none',
      }}
    >
      {initials}
    </span>
  );
}
