import Link from 'next/link';
import styles from './Landing.module.css';

// For a person who is not signed in. No data calls and no images: a name, one line about what
// Spotter is, and the two ways in.
export function Landing() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Spotter</h1>
      <p className={styles.text}>
        Ask your gym. Answers come from the gym&apos;s own records, never from the internet.
      </p>
      <div className={styles.actions}>
        <Link href="/sign-up" className={styles.primary}>
          Create account
        </Link>
        <Link href="/log-in" className={styles.secondary}>
          Log in
        </Link>
      </div>
    </main>
  );
}
