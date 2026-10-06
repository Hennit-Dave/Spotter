'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './AuthCard.module.css';

// A submit button that turns off while its form is being sent, so a second tap cannot send
// the same form again. Every button in one form goes off together.
export function PendingButton({
  children,
  name,
  value,
  secondary = false,
  skipValidation = false,
}: {
  children: ReactNode;
  name?: string;
  value?: string;
  secondary?: boolean;
  skipValidation?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      formNoValidate={skipValidation}
      className={`${styles.button} ${secondary ? styles.buttonSecondary : ''}`}
    >
      {pending ? 'Saving' : children}
    </button>
  );
}
