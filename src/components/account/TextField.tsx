'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import fieldStyles from '@/components/admin/AuthCard.module.css';
import { EMPTY_MESSAGE, FieldError } from './FieldError';
import errorStyles from './FieldError.module.css';
import styles from './TextField.module.css';
import { EMAIL_MESSAGE, isValidEmail } from './email-format';
import { FULL_NAME_MESSAGE, isFullName } from './full-name';

// A form field that says so beside itself when it is left empty. The check runs when the person
// leaves the field (an email is also checked as it is typed), and again when they try to send the form. The browser's own pop-up is
// replaced by the same message. The server checks every field again.
export function TextField({
  name,
  label,
  type,
  autoComplete,
  required = true,
  min,
  maxLength,
  defaultValue,
  fullName = false,
  checkEmail = false,
  hint,
}: {
  name: string;
  label: string;
  type: 'email' | 'password' | 'text' | 'date' | 'tel';
  autoComplete: string;
  required?: boolean;
  min?: string;
  maxLength?: number;
  defaultValue?: string;
  fullName?: boolean;
  checkEmail?: boolean;
  // Shown under the field once the person starts typing, never before.
  hint?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState(false);
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isPassword = type === 'password';

  function problem(value: string): string | null {
    if (value.trim() === '') return required ? EMPTY_MESSAGE : null;
    if (fullName && !isFullName(value)) return FULL_NAME_MESSAGE;
    if (checkEmail && !isValidEmail(value)) return EMAIL_MESSAGE;
    return null;
  }

  // The browser's own validity carries the rules, so the form's submit button can ask the form.
  function report(value: string) {
    input.current?.setCustomValidity(problem(value) ?? '');
  }

  useEffect(() => {
    report(input.current?.value ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onInvalid(event: FormEvent<HTMLInputElement>) {
    // Replace the browser's pop-up, and put the cursor on the first field that needs fixing.
    event.preventDefault();
    const input = event.currentTarget;
    setError(problem(input.value) ?? EMPTY_MESSAGE);
    if (input.form?.querySelector(':invalid') === input) input.focus();
  }

  return (
    <div className={fieldStyles.field}>
      <label htmlFor={name} className={fieldStyles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          ref={input}
          id={name}
          name={name}
          type={isPassword && visible ? 'text' : type}
          autoComplete={autoComplete}
          required={required}
          min={min}
          maxLength={maxLength}
          defaultValue={defaultValue}
          className={`${fieldStyles.input} ${isPassword ? styles.withToggle : ''} ${error ? errorStyles.invalid : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : '', hint && typed ? hintId : ''].join(' ').trim() || undefined}
          onBlur={(event) => setError(problem(event.currentTarget.value))}
          onChange={(event) => {
            const value = event.currentTarget.value;
            report(value);
            setTyped(value !== '');
            // An email is checked on every keystroke, from the first one. Other fields wait
            // until they have been left once, then clear as soon as they are fixed.
            if (error || (checkEmail && value !== '')) setError(problem(value));
          }}
          onInvalid={onInvalid}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setVisible((shown) => !shown)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              {visible ? (
                <>
                  <path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2" />
                  <path d="m1 1 22 22" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>
      {hint && typed && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
