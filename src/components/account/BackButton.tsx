'use client';

import { useRouter } from 'next/navigation';
import styles from './AccountLayout.module.css';

export function BackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <button type="button" className={styles.back} onClick={goBack}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m12 19-7-7 7-7M5 12h14" />
      </svg>
      Back to Spotter
    </button>
  );
}
