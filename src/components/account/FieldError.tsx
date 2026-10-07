import styles from './FieldError.module.css';

export const EMPTY_MESSAGE = 'This field must not be empty';

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className={styles.error} role="alert">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={styles.icon}
      >
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
      {message}
    </p>
  );
}
