/** Skeleton in the page's real proportions so nothing jumps when content arrives. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading fragrance">
      <div style={{ background: 'var(--linen)', padding: 'var(--s-8) 0 var(--s-10)' }}>
        <div className="page" style={{ display: 'grid', gap: 'var(--s-8)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div className="skeleton" style={{ aspectRatio: '3 / 4', maxWidth: 520, width: '100%' }} />
          <div style={{ display: 'grid', gap: 16, alignContent: 'center' }}>
            <div className="skeleton" style={{ height: 18, width: 160 }} />
            <div className="skeleton" style={{ height: 72, width: '80%' }} />
            <div className="skeleton" style={{ height: 18, width: 260 }} />
            <div className="skeleton" style={{ height: 110, width: '100%', marginTop: 24 }} />
            <div className="skeleton" style={{ height: 44, width: 320 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
