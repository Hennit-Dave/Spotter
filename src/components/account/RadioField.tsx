import styles from './RadioField.module.css';

// A required choice with no default, so nobody answers by leaving a form alone. Each option
// is a full-height tap target.
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
  return (
    <fieldset className={styles.group}>
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
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
