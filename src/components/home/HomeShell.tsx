import { COMMON_QUESTIONS } from './questions';
import styles from './HomeShell.module.css';

export function HomeShell() {
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>Spotter</h1>
      </header>

      <section className={styles.statusStrip} aria-label="Membership status">
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Tier</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Expires</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Days trained</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Balance</span>
        </div>
      </section>

      <section className={styles.questionsSection} aria-label="Common questions">
        {COMMON_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className={styles.questionButton}
          >
            {question}
          </button>
        ))}
      </section>

      <section className={styles.inputSection} aria-label="Ask a question">
        <input
          type="text"
          maxLength={300}
          placeholder="Ask a question"
          className={styles.questionInput}
          aria-label="Optional question"
        />
      </section>
    </main>
  );
}
