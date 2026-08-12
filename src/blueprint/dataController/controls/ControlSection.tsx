import type { ReactNode } from 'react';
import './controlSection.css';

export function ControlSection({
  title,
  onReset,
  resetDisabled,
  resetLabel = 'Reset',
  children,
}: {
  title: string;
  onReset?: () => void;
  resetDisabled?: boolean;
  resetLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="property-panel">
      <div className="title">{title}</div>
      {children}
      {onReset && (
        <button
          className="action-button danger"
          disabled={resetDisabled}
          onClick={onReset}
          type="button"
        >
          {resetLabel}
        </button>
      )}
    </section>
  );
}

export function ControlGrid({ children }: { children: ReactNode }) {
  return <div className="blueprint-control-grid">{children}</div>;
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="property-field">
      <span className="property-label">{label}</span>
      <input
        className="property-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function StatValue({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="property-field">
      <span className="property-label">{label}</span>
      <div className="property-value">{value}</div>
    </div>
  );
}
