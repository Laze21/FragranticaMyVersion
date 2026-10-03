import Link from 'next/link';
import type { FragranceDetail } from '@/lib/data/types';
import { Term } from '@/components/ui/Term';
import { Icon } from '@/components/Icon';
import { CONCENTRATION_LABEL, MARKETED_FOR_LABEL, PRICE_BANDS, type PriceBand } from '@/lib/scent/vocab';
import { SOURCE_TYPE_LABEL } from './SourceBadge';
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

export function Details({ f }: { f: FragranceDetail }) {
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration] : null;
  const band = f.priceBand ? PRICE_BANDS[f.priceBand as PriceBand] : null;
  return (
    <section className={s.section} aria-labelledby="details">
      <SectionHead id="details" title="Details and sources" lede="The facts, and exactly where each one came from." />
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
              {f.perfumers.length
                ? f.perfumers.map((p, i) => (
                    <span key={p.slug}>
                      {i > 0 && ', '}
                      <Link href={`/perfumer/${p.slug}`}>{p.name}</Link>
                    </span>
                  ))
                : 'Not disclosed by the house'}
            </dd>
          </div>
          <div>
            <dt>
              <Term slug="concentration">Concentration</Term>
            </dt>
            <dd>{conc?.long ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Launched</dt>
            <dd>{f.releaseYear ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              {f.status === 'current' ? 'In production' : f.status === 'discontinued' ? `Discontinued${f.discontinuedYear ? ` (${f.discontinuedYear})` : ''}` : f.status === 'reformulated' ? 'In production, reformulated' : f.status === 'limited' ? 'Limited edition' : 'Announced, not yet released'}
            </dd>
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
              {band ? `${band.label} (${band.range})` : 'Unknown'}
              {f.priceUsd && f.sizeMl ? <span className={styles.aside}>Typically about ${Math.round(f.priceUsd)} for {f.sizeMl} ml at full retail.</span> : null}
            </dd>
          </div>
          {(f.flankers.length > 0 || f.parent) && (
            <div>
              <dt>
                <Term slug="flanker">Related versions</Term>
              </dt>
              <dd>
                {[...(f.parent ? [{ slug: f.parent.slug, name: f.parent.name, concentration: null, releaseYear: null }] : []), ...f.flankers].map((x, i) => (
                  <span key={x.slug}>
                    {i > 0 && ', '}
                    <Link href={`/fragrance/${x.slug}`}>{x.name}</Link>
                  </span>
                ))}
              </dd>
            </div>
          )}
          {f.variants.length > 0 && (
            <div>
              <dt>
                <Term slug="reformulation">Formulations</Term>
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

        <div>
          <h3 className={styles.subhead}>Where this page’s facts come from</h3>
          <ul role="list" className={styles.sources}>
            {f.claims.map((c) => (
              <li key={c.id}>
                <span className={styles.field}>{FIELD_LABEL[c.field] ?? c.field}</span>
                <span className={styles.src}>
                  <span className={styles.type} data-type={c.sourceType}>
                    {SOURCE_TYPE_LABEL[c.sourceType] ?? c.sourceType}
                  </span>{' '}
                  {c.sourceUrl ? (
                    <a href={c.sourceUrl} target="_blank" rel="noopener nofollow">
                      {c.sourceName} <Icon name="external" size={13} />
                    </a>
                  ) : (
                    c.sourceName
                  )}
                  {c.notes && <span className={styles.aside}>{c.notes}</span>}
                </span>
                <span className={styles.conf}>
                  {c.confidence !== null ? (c.confidence >= 0.85 ? 'High confidence' : c.confidence >= 0.6 ? 'Medium confidence' : 'Low confidence') : ''}
                  {c.verifiedAt ? ` · checked ${new Date(c.verifiedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ' · not yet verified'}
                </span>
              </li>
            ))}
            <li>
              <span className={styles.field}>Community figures</span>
              <span className={styles.src}>
                <span className={styles.type} data-type="community">
                  Community
                </span>{' '}
                {f.stats.includesBaseline ? 'Demo baseline plus any real votes made here' : 'Votes made on this site'}
                {f.stats.includesBaseline && (
                  <span className={styles.aside}>
                    The prototype seeds generated distributions so charts aren’t empty. They are not real people’s votes and are marked “Demo figures”.
                  </span>
                )}
              </span>
              <span className={styles.conf} />
            </li>
          </ul>
          <p className={styles.fix}>
            <Link href={`/contribute?fragrance=${f.slug}`} className="arrow-link">
              Spot something wrong? Suggest a correction with a source <Icon name="arrow-right" size={16} />
            </Link>
          </p>
          <p className={styles.policy}>
            We never copy other fragrance databases. Official notes come from the house or an authorised retailer; everything else is
            our editorial work or this community’s.
          </p>
        </div>
      </div>
    </section>
  );
}
