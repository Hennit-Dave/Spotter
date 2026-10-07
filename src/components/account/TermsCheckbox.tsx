'use client';

import { useId, useState, type FormEvent } from 'react';
import { FieldError } from './FieldError';
import errorStyles from './FieldError.module.css';
import styles from './TermsCheckbox.module.css';

export const TERMS_MESSAGE = 'Accept the Terms of Service to create an account';

// The box a person ticks to accept the terms before an account is made. The create button stays
// off until it is ticked, so the message below only shows if the form is sent some other way,
// for example before the script has loaded.
export function TermsCheckbox() {
  const [missing, setMissing] = useState(false);
  const id = useId();
  const errorId = `${id}-error`;

  function onInvalid(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
    setMissing(true);
    event.currentTarget.focus();
  }

  return (
    <div className={styles.field}>
      <label className={`${styles.option} ${missing ? errorStyles.invalid : ''}`}>
        <input
          type="checkbox"
          name="terms"
          value="accepted"
          required
          className={styles.box}
          aria-describedby={missing ? errorId : undefined}
          onChange={(event) => setMissing(!event.currentTarget.checked && missing)}
          onInvalid={onInvalid}
        />
        <span>
          I accept the{' '}
          <a href="/?view=terms" target="_blank" rel="noopener">
            Terms of Service
          </a>
        </span>
      </label>
      {missing && <FieldError id={errorId} message={TERMS_MESSAGE} />}
    </div>
  );
}
