import type { ReactNode } from 'react';
import { Notice, type AuthNotice } from '@/components/admin/AuthCard';
import styles from './AuthFrame.module.css';

// The framed card that holds an account form. It is plain markup, not a modal, so the logo and
// back button in the account navigation stay clickable.
export function AuthFrame({
  title,
  notice,
  children,
}: {
  title: string;
  notice?: AuthNotice;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.frame} aria-labelledby="auth-frame-title">
        <h1 id="auth-frame-title" className={styles.title}>
          {title}
        </h1>
        {notice && <Notice notice={notice} />}
        {children}
      </section>
    </main>
  );
}
