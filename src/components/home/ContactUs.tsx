'use client';

import { useId, useRef, type FormEvent } from 'react';
import styles from './ContactUs.module.css';

export function ContactUs({ supportEmail }: { supportEmail?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  function openEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supportEmail) return;
    const form = new FormData(event.currentTarget);
    const subject = String(form.get('subject') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        Contact us <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.heading}>
          <h2 id={`${id}-title`}>Contact Spotter support</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close contact form"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <p id={`${id}-description`} className={styles.description}>
          Write your message below. We&apos;ll open your email app so you can review and send it.
        </p>
        {supportEmail && <p className={styles.recipient}>To: {supportEmail}</p>}
        <form onSubmit={openEmail} className={styles.form}>
          <label className={styles.field}>
            Subject
            <input name="subject" type="text" required maxLength={120} />
          </label>
          <label className={styles.field}>
            Message
            <textarea name="message" required rows={5} maxLength={2000} />
          </label>
          {!supportEmail && (
            <p className={styles.description}>The support email address is not available yet.</p>
          )}
          <button type="submit" className={styles.submit} disabled={!supportEmail}>
            Open email app
          </button>
        </form>
      </dialog>
    </>
  );
}
