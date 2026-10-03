import type { Metadata } from 'next';
import styles from '../../editorial.module.css';

export const metadata: Metadata = { title: 'Ads and affiliate links' };

export default function AdsPage() {
  return (
    <article className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Ads and affiliate links</h1>
        <p className={styles.lede}>How this place will pay for itself without becoming the thing everyone complains about.</p>
      </header>
      <div className={`t-prose ${styles.prose}`}>
        <h2>Never</h2>
        <ul>
          <li>Pop-ups, interstitials, or anything that covers what you came to read.</li>
          <li>Ads that load late and push the page around while you scroll.</li>
          <li>Autoplay video.</li>
          <li>Ads between every section, or ads dressed up as reviews, lists or “community picks”.</li>
          <li>Selling your shelf or diary data.</li>
        </ul>
        <h2>Maybe, clearly labelled</h2>
        <ul>
          <li>“Where to buy” links. If a retailer pays us for a sale, the link says so.</li>
          <li>Sample sellers, so you can try before you buy a bottle.</li>
          <li>One reserved, fixed-size sponsor slot on some pages. It never moves the layout.</li>
          <li>Brand partnerships, labelled as partnerships, with no say over reviews or ratings.</li>
          <li>An optional paid tier for deeper collection analytics. Everything you see today stays free.</li>
        </ul>
        <p>Right now there are no ads at all.</p>
      </div>
    </article>
  );
}
