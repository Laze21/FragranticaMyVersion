/** The logo mark is a Trail in miniature: a nib, a swell, a long taper. */
export function TrailMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 16" aria-hidden="true" focusable="false">
      <path d="M1 8C4 8 6 2.6 11 2.4 17 2.2 22 5 39 7.6 22 10.6 17 13.8 11 13.6 6 13.4 4 8 1 8Z" fill="currentColor" />
      <path d="M11 2.4C17 2.2 22 5 39 7.6 26 7 18 6.4 11 2.4Z" fill="var(--porcelain)" opacity="0.38" />
    </svg>
  );
}
