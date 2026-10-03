import { Icon } from '@/components/Icon';

export function PrivateProfile({ name }: { name: string }) {
  return (
    <div className="page" style={{ paddingTop: 'var(--s-10)', maxWidth: 560 }}>
      <Icon name="lock" size={28} />
      <h1 style={{ fontSize: 'var(--t-title-m)', fontWeight: 650, marginTop: 12 }}>{name} keeps their profile private</h1>
      <p style={{ marginTop: 8, color: 'var(--fg-2)' }}>Their shelf, diary and lists are only visible to them.</p>
    </div>
  );
}
