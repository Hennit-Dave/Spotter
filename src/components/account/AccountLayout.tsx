import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoMark } from '@/components/home/LogoMark';
import { BackButton } from './BackButton';
import styles from './AccountLayout.module.css';

export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <nav className={styles.navigation} aria-label="Account navigation">
        <Link href="/" prefetch={false} className={styles.brand} aria-label="Spotter home">
          <LogoMark />
        </Link>
        <BackButton />
      </nav>
      {children}
    </div>
  );
}
