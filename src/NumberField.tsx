import { useState } from 'react';

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  guideTarget?: string;
  placeholder?: string;
  onClear?: () => void;
  onChange: (value: number) => void;
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  className,
  disabled,
  guideTarget,
  placeholder,
  onClear,
  onChange,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const finiteValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
  const apply = (nextValue: number) => {
    const value = clamp(nextValue, min, max);
    setDraft(String(value));
    onChange(value);
  };
  const changeBy = (direction: 1 | -1) => {
    const current = draft === '' ? 0 : finiteValue ?? 0;
    apply(current + direction * step);
  };

  return (
    <label
      className={['property-field', className].filter(Boolean).join(' ')}
      data-guide-target={guideTarget}
    >
      <span className="property-label">{label}</span>
      <span className="number-field-input">
        <input
          className="property-input"
          disabled={disabled}
          max={max}
          min={min}
          onChange={(event) => {
            const input = event.target.value;
            setDraft(input);
            if (input.trim() === '') {
              if (onClear) onClear();
              else onChange(0);
              return;
            }
            apply(Number(input));
          }}
          onBlur={() => {
            if (draft !== '') setDraft(null);
          }}
          step={step}
          placeholder={placeholder}
          type="number"
          value={draft ?? finiteValue ?? ''}
        />
        <span className="number-field-arrows">
          <button
            aria-label={`Increase ${label}`}
            disabled={disabled || (
              max !== undefined && (finiteValue ?? min ?? 0) >= max
            )}
            onClick={() => changeBy(1)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          />
          <button
            aria-label={`Decrease ${label}`}
            disabled={disabled || (
              min !== undefined && (finiteValue ?? min ?? 0) <= min
            )}
            onClick={() => changeBy(-1)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          />
        </span>
      </span>
    </label>
  );
}

function clamp(value: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}
