import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './AuthCard.module.css';

export interface AuthNotice {
  tone: 'error' | 'info';
  text: string;
}

export function AuthCard({
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
      <h1 className={styles.title}>{title}</h1>
      {notice && (
        <p
          className={`${styles.notice} ${notice.tone === 'error' ? styles.error : styles.info}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
      {children}
    </main>
  );
}

export function TextField({
  name,
  label,
  type,
  autoComplete,
}: {
  name: string;
  label: string;
  type: 'email' | 'password' | 'text';
  autoComplete: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className={styles.input}
      />
    </div>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className={styles.button}>
      {children}
    </button>
  );
}

export function Form({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form action={action} className={styles.form}>
      {children}
    </form>
  );
}

export function Text({ children }: { children: ReactNode }) {
  return <p className={styles.text}>{children}</p>;
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
    </Link>
  );
}
