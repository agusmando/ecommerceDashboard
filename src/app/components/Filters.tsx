import type { ReactNode } from 'react';
import { FilterX, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

/** Contenedor de filtros: buscador + selects + "Limpiar". */
export function FilterBar({
  children,
  activeCount = 0,
  onReset,
  right,
  className,
}: {
  children: ReactNode;
  activeCount?: number;
  onReset?: () => void;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 lg:flex-row lg:items-center', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">
        {onReset && activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <FilterX className="w-4 h-4" />
            Limpiar ({activeCount})
          </Button>
        )}
        {right}
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-input-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** Select compacto para barras de filtros. `value=''` = todos. */
export function FilterSelect<V extends string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  className,
}: {
  value: V | '';
  onChange: (v: V | '') => void;
  options: Option<V>[];
  /** Texto de la opción "todos". */
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label ?? placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value as V | '')}
      className={cn(
        'h-9 rounded-lg border border-border bg-input-background px-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
        value ? 'text-foreground' : 'text-muted-foreground',
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Segmentado Todos / Activos / Inactivos (mapea a ?active=). */
export function ActiveFilter({
  value,
  onChange,
  labels = ['Todos', 'Activos', 'Inactivos'],
}: {
  value: '' | 'true' | 'false';
  onChange: (v: '' | 'true' | 'false') => void;
  labels?: [string, string, string];
}) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: labels[0] },
        { value: 'true', label: labels[1] },
        { value: 'false', label: labels[2] },
      ]}
    />
  );
}

export function Segmented<V extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn('inline-flex min-h-9 flex-wrap items-center rounded-lg bg-muted p-1 text-sm', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 rounded-md px-3 font-medium transition-colors whitespace-nowrap',
            value === o.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Input de fecha compacto con etiqueta inline. */
export function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-input-background px-2.5 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
}
