import type { ReactNode } from 'react';
import styles from '@/components/account/AccountLayout.module.css';

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
