import Link from 'next/link';
import type { FragranceDetail, SourceClaim } from '@/lib/data/types';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { Icon } from '@/components/Icon';
import { CONCENTRATION_LABEL, MARKETED_FOR_LABEL, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { cleanSourceName, confidenceWord, fmtMonth } from './SourceBadge';
import { SectionHead } from './SectionHead';
import styles from './Details.module.css';
import s from './sections.module.css';

const FIELD_LABEL: Record<string, string> = {
  identity: 'Name, house, year',
  notes: 'Official notes',
  perfumers: 'Perfumer',
  price: 'Typical price',
  status: 'Availability',
  image: 'Bottle image',
  description: 'House description',
  model_3d: '3D model',
};

const STATUS: Record<string, (f: FragranceDetail) => string> = {
  current: () => 'In production',
  discontinued: (f) => (f.discontinuedYear ? `Discontinued in ${f.discontinuedYear}` : 'Discontinued'),
  reformulated: () => 'In production, reformulated',
  limited: () => 'Limited edition',
  upcoming: () => 'Announced, not yet released',
};

function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** The one line a reader gets for a claim nobody has checked yet. The build log stays in admin. */
function uncheckedLine(c: SourceClaim, brandName: string) {
  const h = host(c.sourceUrl);
  return `Not yet checked against ${h ?? `${brandName}’s own page`}`;
}

/**
 * Details: a compact facts table and, beside it, where every fact on the page came from. No
 * paper box. Null values use the house phrases: "Not known yet" for a fact we lack, "Not
 * disclosed" for a perfumer the house keeps to itself.
 */
export function Details({ f }: { f: FragranceDetail }) {
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration] : null;
  const band = f.priceBand ? PRICE_BANDS[f.priceBand as PriceBand] : null;
  const related = [...(f.parent ? [{ slug: f.parent.slug, name: f.parent.name }] : []), ...f.flankers];
  return (
    <section className={`${s.section} ${s['gap-96']}`} aria-labelledby="details">
      <SectionHead id="details" title="Details" lede="The facts, and where each one came from." />
      <div className={styles.grid}>
        <dl className={styles.facts}>
          <div>
            <dt>House</dt>
            <dd>
              <Link href={`/house/${f.brandSlug}`}>{f.brandName}</Link>
            </dd>
          </div>
          <div>
            <dt>Perfumer</dt>
            <dd>
              {f.perfumers.length ? (
                f.perfumers.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && ', '}
                    <Link href={`/perfumer/${p.slug}`}>{p.name}</Link>
                  </span>
                ))
              ) : (
                <span className={styles.null}>Not disclosed</span>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <Term slug="concentration" quiet>
                Concentration
              </Term>
            </dt>
            <dd>{conc?.long ?? <span className={styles.null}>Not known yet</span>}</dd>
          </div>
          <div>
            <dt>Launched</dt>
            <dd className="tnum">{f.releaseYear ?? <span className={styles.null}>Not known yet</span>}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{(STATUS[f.status] ?? STATUS.current)(f)}</dd>
          </div>
          <div>
            <dt>Marketed</dt>
            <dd>
              {MARKETED_FOR_LABEL[f.marketedFor]}
              <span className={styles.aside}>That’s the house’s positioning. Anyone can wear anything.</span>
            </dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>
              {band ? `${band.label}, ${band.range}` : <span className={styles.null}>Not known yet</span>}
              {f.priceUsd && f.sizeMl ? (
                <span className={`${styles.aside} tnum`}>
                  About ${Math.round(f.priceUsd)} for {f.sizeMl} ml at full retail.
                </span>
              ) : null}
            </dd>
          </div>
          {related.length > 0 && (
            <div>
              <dt>
                <Term slug="flanker" quiet>
                  Related versions
                </Term>
              </dt>
              <dd>
                {related.map((x, i) => (
                  <span key={x.slug}>
                    {i > 0 && ', '}
                    <Link href={`/fragrance/${x.slug}`} className={styles.name}>
                      {x.name}
                    </Link>
                  </span>
                ))}
              </dd>
            </div>
          )}
          {f.variants.length > 0 && (
            <div>
              <dt>
                <Term slug="reformulation" quiet>
                  Formulations
                </Term>
              </dt>
              <dd>
                {f.variants.map((v) => (
                  <span key={v.label} className={styles.variant}>
                    {v.label}
                    {v.notes && <span className={styles.aside}>{v.notes}</span>}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <div className={styles.sourcesCol}>
          <h3 className={`${s.h3} ${styles.subhead}`}>Where this page’s facts come from</h3>
          <ul role="list" className={styles.sources}>
            {f.claims.map((c) => {
              const word = confidenceWord(c.confidence);
              return (
                <li key={c.id}>
                  <span className={styles.field}>{FIELD_LABEL[c.field] ?? c.field}</span>
                  <span className={styles.src}>
                    <span className={styles.srcLine}>
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noopener nofollow">
                          {cleanSourceName(c.sourceName)} <Icon name="external" size={12} />
                        </a>
                      ) : (
                        cleanSourceName(c.sourceName)
                      )}
                      <span className={styles.status} data-checked={c.verifiedAt ? '' : undefined}>
                        {c.verifiedAt ? `Checked ${fmtMonth(c.verifiedAt)}` : 'Not yet checked'}
                      </span>
                      {word && (
                        <span className={styles.conf}>
                          <b>{word}</b> confidence
                        </span>
                      )}
                    </span>
                    {!c.verifiedAt && <span className={styles.aside}>{uncheckedLine(c, f.brandName)}</span>}
                  </span>
                </li>
              );
            })}
            <li>
              <span className={styles.field}>Community figures</span>
              <span className={styles.src}>
                <span className={styles.srcLine}>
                  {f.stats.includesBaseline ? 'Demo baseline plus any real votes made here' : 'Votes made on this site'}
                  {f.stats.includesBaseline && <DemoFlag />}
                </span>
                {f.stats.includesBaseline && (
                  <span className={styles.aside}>The prototype seeds generated distributions so the charts can be read. They are not real people’s votes.</span>
                )}
              </span>
            </li>
          </ul>
          <p className={styles.fix}>
            <Link href={`/contribute?fragrance=${f.slug}`}>Spot something wrong? Suggest a correction with a source</Link>
          </p>
          <p className={styles.policy}>
            We never copy other fragrance databases. Official notes come from the house or an authorised retailer; everything else is our editorial work or this
            community’s.
          </p>
        </div>
      </div>
    </section>
  );
}
