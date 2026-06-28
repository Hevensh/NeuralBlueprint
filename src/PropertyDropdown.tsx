import { useEffect, useRef, useState } from 'react';

interface PropertyDropdownOption<T extends string> {
  label: string;
  value: T;
}

interface PropertyDropdownProp<T extends string> {
  options: PropertyDropdownOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}

export function PropertyDropdown<T extends string>({
  disabled,
  options,
  value,
  onChange,
}: PropertyDropdownProp<T>) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', closeOnOutsideClick);
    return () => window.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  return (
    <div className={`property-dropdown ${open ? 'open' : ''}`} ref={dropdownRef}>
      <button
        className="property-dropdown-trigger"
        disabled={disabled}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        type="button"
      >
        <span>{selectedOption.label}</span>
        <span className="property-dropdown-arrow" />
      </button>

      {open && (
        <div className="property-dropdown-menu">
          {options.map((option) => (
            <button
              className={`property-dropdown-option ${option.value === value ? 'selected' : ''}`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
