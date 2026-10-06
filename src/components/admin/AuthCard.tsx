import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './AuthCard.module.css';

export interface AuthNotice {
  tone: 'error' | 'info' | 'warning';
  text: string;
}

export function Notice({ notice }: { notice: AuthNotice }) {
  return (
    <p
      className={`${styles.notice} ${styles[notice.tone]}`}
      role={notice.tone === 'error' ? 'alert' : 'status'}
    >
      {notice.text}
    </p>
  );
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
      {notice && <Notice notice={notice} />}
      {children}
    </main>
  );
}

export function TextField({
  name,
  label,
  type,
  autoComplete,
  required = true,
  min,
  maxLength,
  defaultValue,
}: {
  name: string;
  label: string;
  type: 'email' | 'password' | 'text' | 'date' | 'tel';
  autoComplete: string;
  required?: boolean;
  min?: string;
  maxLength?: number;
  defaultValue?: string;
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
        required={required}
        min={min}
        maxLength={maxLength}
        defaultValue={defaultValue}
        className={styles.input}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <select id={name} name={name} required defaultValue={defaultValue} className={styles.input}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
