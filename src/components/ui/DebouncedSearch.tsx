import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';

/**
 * Debounced search field. Local state keeps typing smooth and only pushes to the
 * caller after a short pause; it re-syncs when the value changes externally (Clear).
 */
export function DebouncedSearch({
  label,
  placeholder,
  value,
  onChange,
  delayMs = 200,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  delayMs?: number;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <Input
      label={label}
      hideLabel
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      prefix={<Search className="h-4 w-4" />}
      suffix={
        local ? (
          <button type="button" aria-label="Clear search" onClick={() => setLocal('')} className="hover:text-text">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
      className="max-w-none"
    />
  );
}
