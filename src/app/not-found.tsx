import Link from 'next/link';
import styles from './editorial.module.css';

export default function NotFound() {
  return (
    <div className={`page ${styles.page}`}>
      <p className="t-meta">404</p>
      <h1 className={styles.title}>Nothing here.</h1>
      <p className={styles.lede}>The page evaporated, or it was never bottled. Try a search, or start from somewhere familiar.</p>
      <p className="cluster" style={{ marginTop: 'var(--s-5)' }}>
        <Link className="btn" href="/discover">
          Search fragrances
        </Link>
        <Link className="btn btn--quiet" href="/">
          Home
        </Link>
        <Link className="btn btn--quiet" href="/contribute">
          Suggest a missing fragrance
        </Link>
      </p>
    </div>
  );
}
