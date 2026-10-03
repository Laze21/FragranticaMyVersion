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

/** A source is named like a source: no build-log prefixes, no "(to verify)" parentheticals. */
export function cleanSourceName(name: string): string {
  return name
    .replace(/^\s*OFFLINE[\s:·-]*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
}

export const fmtMonth = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null);

export function confidenceWord(c: number | null): 'High' | 'Medium' | 'Low' | null {
  if (c === null) return null;
  return c >= 0.85 ? 'High' : c >= 0.6 ? 'Medium' : 'Low';
}

/** Where a claim came from, one tap away. The badge says checked or not; the popover says by whom. */
export function SourceBadge({ claim }: { claim: SourceClaim }) {
  const word = confidenceWord(claim.confidence);
  return (
    <Popover
      label="Where this came from"
      triggerClassName={styles.badge}
      trigger={
        <>
          <Icon name="source" size={14} />
          {SOURCE_TYPE_LABEL[claim.sourceType] ?? claim.sourceType}
          <span className={styles.date}>{claim.verifiedAt ? `· checked ${fmtMonth(claim.verifiedAt)}` : '· not yet checked'}</span>
        </>
      }
    >
      <span className={styles.popTitle}>{cleanSourceName(claim.sourceName)}</span>
      <dl className={styles.dl}>
        <div>
          <dt>Type</dt>
          <dd>{SOURCE_TYPE_LABEL[claim.sourceType] ?? claim.sourceType}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{fmtMonth(claim.verifiedAt) ?? 'Not yet'}</dd>
        </div>
        {word && (
          <div>
            <dt>Confidence</dt>
            <dd>{word}</dd>
          </div>
        )}
      </dl>
      {claim.sourceUrl ? (
        <a href={claim.sourceUrl} rel="noopener nofollow" target="_blank" className={styles.link}>
          Open the source <Icon name="external" size={14} />
        </a>
      ) : (
        <span className={styles.note}>No page to link to yet: this is editorial and still waiting to be checked against the house.</span>
      )}
    </Popover>
  );
}
