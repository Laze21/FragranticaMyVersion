import { Popover } from '@/components/ui/Popover';
import { Icon } from '@/components/Icon';
import type { SourceClaim } from '@/lib/data/types';
import styles from './SourceBadge.module.css';

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  official_brand: 'Official',
  licensed_database: 'Licensed data',
  editorial: 'Editorial',
  community: 'Community',
  public_dataset: 'Public dataset',
  retailer_feed: 'Retailer',
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'not yet');

/** Where a claim came from, one tap away. */
export function SourceBadge({ claim }: { claim: SourceClaim }) {
  return (
    <Popover
      label="Where this came from"
      triggerClassName={styles.badge}
      trigger={
        <>
          <Icon name="source" size={14} />
          {SOURCE_TYPE_LABEL[claim.sourceType] ?? claim.sourceType}
          {claim.isDemo && <span className={styles.demo}>demo</span>}
          <span className={styles.date}>· checked {fmtDate(claim.verifiedAt)}</span>
        </>
      }
    >
      <span className={styles.popTitle}>{claim.sourceName}</span>
      <dl className={styles.dl}>
        <div>
          <dt>Type</dt>
          <dd>{SOURCE_TYPE_LABEL[claim.sourceType]}</dd>
        </div>
        <div>
          <dt>Last verified</dt>
          <dd>{fmtDate(claim.verifiedAt)}</dd>
        </div>
        {claim.confidence !== null && (
          <div>
            <dt>Confidence</dt>
            <dd>{claim.confidence >= 0.85 ? 'High' : claim.confidence >= 0.6 ? 'Medium' : 'Low'}</dd>
          </div>
        )}
      </dl>
      {claim.notes && <span className={styles.note}>{claim.notes}</span>}
      {claim.sourceUrl ? (
        <a href={claim.sourceUrl} rel="noopener nofollow" target="_blank" className={styles.link}>
          Open source <Icon name="external" size={14} />
        </a>
      ) : claim.isDemo ? (
        <span className={styles.note}>Demo source: the house is fictional, so there is no page to link to.</span>
      ) : null}
    </Popover>
  );
}
