'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import buttonStyles from '@/components/admin/AuthCard.module.css';

// A submit button that stays off until every field in its form is filled and error-free. The
// fields report their own rules through the browser's validity (see TextField), so this asks
// the form. It starts enabled so the form still works if the script has not loaded yet.
export function SubmitWhenValid({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(true);

  useEffect(() => {
    const form = button.current?.form;
    if (!form) return;
    // Wait a tick so each field has updated its own validity first. The validity is read, not
    // checked: checkValidity() fires an invalid event on every field, and that would move the
    // cursor and show messages on fields the person has not reached.
    const update = () =>
      setTimeout(
        () =>
          setReady(
            Array.from(form.elements).every(
              (field) => !(field instanceof HTMLInputElement) || field.validity.valid,
            ),
          ),
        0,
      );
    update();
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    return () => {
      form.removeEventListener('input', update);
      form.removeEventListener('change', update);
    };
  }, []);

  return (
    <button
      ref={button}
      type="submit"
      disabled={pending || !ready}
      className={buttonStyles.button}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
