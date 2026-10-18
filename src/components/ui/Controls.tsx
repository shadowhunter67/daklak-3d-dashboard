import type { ChangeEvent } from 'react';
export interface Option {
  value: string;
  label: string;
}
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="ui-segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={o.value === value}
          className={o.value === value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function FilterChips({
  options,
  selected,
  onChange,
  label,
}: {
  options: Option[];
  selected: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="ui-filter-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          aria-pressed={selected.includes(o.value)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function SelectField({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label className="ui-field" htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="ui-field" htmlFor={id}>
      {label}
      <input id={id} type="search" value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}
