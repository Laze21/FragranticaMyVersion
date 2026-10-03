'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SearchBox } from '@/components/search/SearchBox';

/**
 * The page evaporated. A search field is the useful thing here, so it is in the page and
 * focused; "Home" is a text link, not a third button. Under /fragrance/* the address was
 * probably a fragrance we do not have yet, and the way forward is to suggest it.
 */
export default function NotFound() {
  const path = usePathname();
  const fragrance = path.startsWith('/fragrance/');
  return (
    <div className="page" style={{ paddingTop: 'var(--s-9)', paddingBottom: 'var(--s-10)' }}>
      <div className="cols-3-10 stack" style={{ ['--stack' as string]: 'var(--s-5)' }}>
        <p className="kicker">404</p>
        <h1 className="t-display" style={{ fontSize: 'var(--t-title-l)' }}>
          {fragrance ? 'No fragrance at this address.' : 'Nothing here.'}
        </h1>
        <p className="t-prose" style={{ color: 'var(--fg-2)' }}>
          {fragrance
            ? 'The page evaporated, or it was never bottled. If it is a fragrance we should have, tell us and we will add it.'
            : 'The page evaporated, or it was never bottled. Try a search, or start from somewhere familiar.'}
        </p>
        <div style={{ maxWidth: 520 }}>
          <SearchBox inline autoFocus />
        </div>
        <p className="cluster" style={{ ['--cluster' as string]: 'var(--s-5)' }}>
          {fragrance ? (
            <Link className="btn" href="/contribute">
              Suggest it
            </Link>
          ) : (
            <Link className="btn" href="/discover">
              Browse every fragrance
            </Link>
          )}
          <Link href="/" className="arrow-link">
            Home
          </Link>
          {fragrance && (
            <Link href="/discover" className="arrow-link">
              Browse every fragrance
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
