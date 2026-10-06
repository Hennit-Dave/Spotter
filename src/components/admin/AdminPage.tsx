import type { ReactNode } from 'react';
import { NavLink } from './AuthCard';
import styles from './AdminPage.module.css';

export function AdminPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <NavLink href="/admin">Desk home</NavLink>
      </header>
      {children}
    </main>
  );
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
