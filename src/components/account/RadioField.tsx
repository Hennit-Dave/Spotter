'use client';

import { useId, useState, type FormEvent } from 'react';
import { EMPTY_MESSAGE, FieldError } from './FieldError';
import styles from './RadioField.module.css';

// A required choice with no default, so nobody answers by leaving a form alone. Each option
// is a full-height tap target. Sending the form with no choice shows the same inline message as
// an empty text field.
export function RadioField({
  name,
  legend,
  options,
  defaultValue,
}: {
  name: string;
  legend: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  const [empty, setEmpty] = useState(false);
  const errorId = `${useId()}-error`;

  function onInvalid(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
    setEmpty(true);
    const first = event.currentTarget.form?.querySelector(':invalid');
    if (first && first === event.currentTarget) event.currentTarget.focus();
  }

  return (
    <fieldset
      className={styles.group}
      aria-describedby={empty ? errorId : undefined}
    >
      <legend className={styles.legend}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={option.value}
            required
            defaultChecked={option.value === defaultValue}
            className={styles.radio}
            onChange={() => setEmpty(false)}
            onInvalid={onInvalid}
          />
          {option.label}
        </label>
      ))}
      {empty && <FieldError id={errorId} message={EMPTY_MESSAGE} />}
    </fieldset>
  );
}
