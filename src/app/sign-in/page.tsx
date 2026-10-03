import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { SignInForm } from '@/components/auth/AuthForms';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function SignIn(props: PageProps<'/sign-in'>) {
  const sp = await props.searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/';
  if (await getViewer()) redirect(next);
  return (
    <div className={`page ${styles.page}`}>
      <div className={styles.col}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Your shelf, your diary, your votes.</p>
        <SignInForm next={next} />
      </div>
    </div>
  );
}
