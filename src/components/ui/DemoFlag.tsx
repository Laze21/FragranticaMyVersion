import { DEMO_MODE } from '@/lib/config';

/** Marks community figures that include generated demo baselines. Never let fake numbers pass as real. */
export function DemoFlag({ label = 'Demo figures' }: { label?: string }) {
  if (!DEMO_MODE) return null;
  return (
    <span className="demo-flag" title="Includes generated demo data so the prototype has realistic distributions. Not real votes.">
      {label}
    </span>
  );
}
