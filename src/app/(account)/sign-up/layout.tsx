import type { ReactNode } from 'react';
import styles from './layout.module.css';

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
