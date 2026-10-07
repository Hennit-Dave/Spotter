import Link from 'next/link';
import { LogoMark } from './LogoMark';
import type { LegalDocument } from './legal-content';
import styles from './LegalView.module.css';

export function LegalView({ document }: { document: LegalDocument }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><LogoMark />Spotter</Link>
        <Link href="/">Back to home</Link>
      </header>
      <main className={styles.content}>
        <p className={styles.eyebrow}>Spotter / Legal</p>
        <h1>{document.title}</h1>
        <aside className={styles.notice} aria-label="Draft status">
          <strong>Draft — not yet effective</strong>
          <p>Business identity, contact details, retention periods, and other open decisions must be confirmed before this document is finalised.</p>
        </aside>
        <p>{document.introduction}</p>
        {document.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.links && (
              <ul>{section.links.map((link) => <li key={link.href}><a href={link.href}>{link.label}</a></li>)}</ul>
            )}
          </section>
        ))}
      </main>
      <footer>
        <nav className={styles.legalLinks} aria-label="Legal">
          <Link href="/?view=privacy" prefetch={false}>Privacy Policy</Link>
          <Link href="/?view=terms" prefetch={false}>Terms of Service</Link>
        </nav>
      </footer>
    </div>
  );
}
