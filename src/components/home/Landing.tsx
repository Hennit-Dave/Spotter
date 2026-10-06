import Link from 'next/link';
import styles from './Landing.module.css';

export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Spotter home">
          <span className={styles.brandMark} aria-hidden="true">s.</span>
          Spotter
        </Link>
        <Link href="/log-in" prefetch={false} className={styles.navLink}>
          Log in <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="landing-title">
          <p className={styles.eyebrow}>Your gym, in your pocket</p>
          <h1 id="landing-title" className={styles.title}>
            Your gym.<br /><span>On the record.</span>
          </h1>
          <p className={styles.text}>
            Ask about your gym, see your attendance and balance, check in, and pay for membership.
            Answers come from your gym&apos;s own records, with a source and a date.
          </p>
          <div className={styles.actions}>
            <Link href="/sign-up" prefetch={false} className={styles.primary}>
              Create account <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/log-in" prefetch={false} className={styles.secondary}>Log in</Link>
          </div>
          <p className={styles.note}>Free app access. Gym membership is separate.</p>
        </section>
        <div className={styles.principles} aria-label="How Spotter answers">
          <p><span aria-hidden="true">01</span> Your gym&apos;s records only</p>
          <p><span aria-hidden="true">02</span> Every answer has a source</p>
          <p><span aria-hidden="true">03</span> No record? Ask the desk.</p>
        </div>
      </main>
      <footer className={styles.footer}>
        <p className={styles.footerBrand}>Spotter</p>
        <p>Your gym&apos;s answer desk.</p>
        <p>Access cards are issued at the gym desk.</p>
      </footer>
    </div>
  );
}
