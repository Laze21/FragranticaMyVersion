import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { SignUpForm } from '@/components/auth/AuthForms';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false } };

export default async function SignUp(props: PageProps<'/sign-up'>) {
  const sp = await props.searchParams;
  const next = typeof sp.next === 'string' && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/';
  if (await getViewer()) redirect(next);
  return (
    <div className={`page ${styles.page}`}>
      <div className={styles.col}>
        <h1 className={styles.title}>Create an account</h1>
        <p className={styles.lede}>Free. No ads in your face, no newsletter you didn’t ask for.</p>
        <SignUpForm next={next} />
      </div>
    </div>
  );
}
