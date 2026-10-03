import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import styles from '../../editorial.module.css';

export const metadata: Metadata = { title: 'Where our data comes from', description: 'How fragrance facts, community figures and images are sourced, labelled and corrected.' };
export const revalidate = 600;

const TYPE: Record<string, string> = {
  official_brand: 'Official (the house)',
  licensed_database: 'Licensed database',
  editorial: 'Editorial research',
  community: 'Community',
  public_dataset: 'Public dataset',
  retailer_feed: 'Retailer',
};

export default async function DataPage() {
  const sources = await sql<{ name: string; source_type: string; license: string | null; is_demo: boolean; claims: string; avg: string | null }>(
    `select d.name, d.source_type, d.license, d.is_demo, count(r.id) claims, avg(r.confidence) avg
       from public.data_sources d left join public.fragrance_source_records r on r.data_source_id = d.id
      group by d.id order by count(r.id) desc, d.name`,
  );
  const verified = await sql<{ total: string; verified: string; withUrl: string }>(
    `select count(*) total, count(*) filter (where verified_at is not null) verified, count(*) filter (where source_url is not null) "withUrl" from public.fragrance_source_records where field <> 'image'`,
  );
  const v = verified[0];
  return (
    <article className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Where our data comes from</h1>
        <p className={styles.lede}>Every fact on a fragrance page carries its source. If we can’t say where something came from, we say that too.</p>
      </header>
      <div className={`t-prose ${styles.prose}`}>
        <h2>Two kinds of truth</h2>
        <p>
          A note list is what a house says is in its fragrance. What people smell is something else, and both are useful. We keep them apart:
          official notes on one side, community perception on the other, each with its own source and sample size.
        </p>
        <h2>What we never do</h2>
        <ul>
          <li>We don’t scrape or copy other fragrance databases, their note lists, their votes or their reviews, and we don’t buy datasets derived from them.</li>
          <li>We don’t hotlink or re-host other sites’ images. Bottle images here are original illustrations until we have licensed photographs.</li>
          <li>We don’t republish brand marketing copy.</li>
          <li>We don’t pass generated or imported numbers off as votes. Anything that isn’t a real vote made here is labelled.</li>
        </ul>
        <h2>The state of this prototype</h2>
        <p>
          The fragrances are real. Launch years, perfumers, official notes and typical prices were compiled by our editors from widely
          published house information.{' '}
          <b>
            {v
              ? Number(v.total) - Number(v.withUrl) === Number(v.total)
                ? `None of the ${Number(v.total)} factual claims has a source link yet`
                : `${Number(v.total) - Number(v.withUrl)} of the ${Number(v.total)} factual claims still have no source link`
              : 'Most factual claims have no source link yet'}
          </b>
          . Each is marked “editorial, not yet verified” with a confidence level, and each will be checked against the house’s own page
          before launch.
        </p>
        <p>
          Ratings, longevity and projection votes, wear-context votes and “what people smell” percentages are <b>demo figures</b>: generated
          distributions so the charts can be explored. Real votes you make are added on top, and the labels disappear once real data replaces
          the baseline. There are no invented reviews.
        </p>
        <h2>Source types</h2>
      </div>
      <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Type</th>
            <th scope="col">Licence</th>
            <th scope="col">Claims</th>
            <th scope="col">Avg. confidence</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.name}>
              <td>
                {s.name}
                {s.is_demo ? ' (demo)' : ''}
              </td>
              <td>{TYPE[s.source_type] ?? s.source_type}</td>
              <td>{s.license ?? '—'}</td>
              <td className="tnum">{s.claims}</td>
              <td className="tnum">{s.avg ? Number(s.avg).toFixed(2) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className={`t-prose ${styles.prose}`}>
        <h2>Where data will come from at launch</h2>
        <ul>
          <li>Official house pages, press releases and packaging, recorded with URLs and dates.</li>
          <li>Wikidata (CC0) for houses, perfumers and stable identifiers.</li>
          <li>Licensed catalogues, only with written warranties that the data wasn’t scraped.</li>
          <li>Retailer feeds for prices and where to buy. Their images and copy stay in the shopping module.</li>
          <li>You: corrections with a source, photos you took, votes and reviews.</li>
        </ul>
        <p>
          Found something wrong? <Link href="/contribute">Suggest a correction</Link>. Every accepted change is logged in public on the{' '}
          <Link href="/about/moderation">moderation log</Link>.
        </p>
      </div>
    </article>
  );
}
