import type { CSSProperties } from "react";
import classes from "./colour-picker.module.css";
import { Icon } from "./icon";

interface ColourPickerProps {
  /** Names the group, e.g. "Class colour". */
  label: string;
  /** Submitted with a form as this field. */
  name: string;
  /** Each colour: its value, the name shown and read out, and its fill. */
  options: {
    value: string;
    label: string;
    fill: string;
    onFill: string;
  }[];
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  /** Only a screen reader says the label: a heading above already shows it. */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Picking one colour from a fixed set: a radio group of round swatches, each
 * named, so it works with a keyboard and a screen reader, and without
 * telling colours apart.
 */
export function ColourPicker({
  label,
  name,
  options,
  value,
  onChange,
  disabled,
  hideLabel,
  className,
}: ColourPickerProps) {
  return (
    <fieldset className={`${classes.group} ${className ?? ""}`}>
      <legend className={hideLabel ? classes.legendHidden : classes.legend}>
        {label}
      </legend>
      <div className={classes.swatches}>
        {options.map((option) => (
          <label
            key={option.value}
            className={classes.option}
            style={
              {
                "--swatch-fill": option.fill,
                "--swatch-on-fill": option.onFill,
              } as CSSProperties
            }
          >
            <input
              type="radio"
              className={classes.input}
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <span className={classes.dot} aria-hidden="true">
              <span className={classes.check}>
                <Icon name="check" size={20} />
              </span>
            </span>
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
