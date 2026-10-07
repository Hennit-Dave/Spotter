import type { ReactNode } from 'react';
import { BackButton } from './BackButton';
import styles from './AccountLayout.module.css';

export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <nav className={styles.navigation} aria-label="Account navigation">
        <BackButton />
      </nav>
      {children}
    </div>
  );
}
