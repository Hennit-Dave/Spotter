'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AccountModal.module.css';

export function AccountModal({ title, children }: { title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const router = useRouter();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    heading.current?.focus();
  }, [title]);

  function dismiss() {
    router.replace('/', { scroll: false });
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom
        ) dismiss();
      }}
    >
      <div className={styles.heading}>
        <h2 ref={heading} id={titleId} tabIndex={-1}>{title}</h2>
        <button type="button" className={styles.close} aria-label="Close account form" onClick={dismiss}>
          ×
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </dialog>
  );
}
