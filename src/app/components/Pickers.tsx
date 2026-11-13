import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface PickOption {
  value: number | string;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

interface BaseProps {
  options: PickOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Búsqueda en el servidor: si se pasa, no se filtra localmente. */
  onSearch?: (q: string) => void;
}

function useFiltered(options: PickOption[], query: string, remote: boolean) {
  return useMemo(() => {
    if (remote || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, remote]);
}

function OptionList({
  options,
  isSelected,
  onPick,
  emptyText,
  loading,
}: {
  options: PickOption[];
  isSelected: (v: PickOption['value']) => boolean;
  onPick: (o: PickOption) => void;
  emptyText: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
      </div>
    );
  }
  if (!options.length) return <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>;
  return (
    <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
      {options.map((o) => {
        const sel = isSelected(o.value);
        return (
          <li key={o.value}>
            <button
              type="button"
              role="option"
              aria-selected={sel}
              disabled={o.disabled}
              onClick={() => onPick(o)}
              className={cn(
                'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50',
                sel && 'bg-accent/60',
              )}
            >
              <Check className={cn('mt-0.5 w-4 h-4 shrink-0 text-primary', !sel && 'invisible')} />
              <span className="min-w-0">
                <span className="block truncate text-foreground">{o.label}</span>
                {o.description && <span className="block text-xs text-muted-foreground">{o.description}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="border-b border-border p-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md bg-input-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

const triggerClass =
  'flex min-h-10 w-full items-center gap-2 rounded-lg border border-border bg-input-background px-3 py-1.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

/** Selección única con búsqueda. */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  loading,
  disabled,
  className,
  onSearch,
  selectedLabel,
  clearable,
}: BaseProps & {
  value: PickOption['value'] | null | undefined;
  onChange: (v: PickOption['value'] | null, option?: PickOption) => void;
  /** Etiqueta a mostrar si la opción elegida no está en `options` (búsqueda remota). */
  selectedLabel?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useFiltered(options, query, !!onSearch);
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? (value != null && value !== '' ? selectedLabel : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={cn(triggerClass, className)}>
          <span className={cn('flex-1 truncate', !label && 'text-muted-foreground')}>{label ?? placeholder}</span>
          {clearable && label ? (
            <X
              className="w-4 h-4 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          ) : (
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0" align="start">
        <SearchBox
          value={query}
          placeholder={searchPlaceholder}
          onChange={(q) => {
            setQuery(q);
            onSearch?.(q);
          }}
        />
        <OptionList
          options={filtered}
          loading={loading}
          emptyText={emptyText}
          isSelected={(v) => v === value}
          onPick={(o) => {
            onChange(o.value, o);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Selección múltiple con chips. */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Sin resultados',
  loading,
  disabled,
  className,
  onSearch,
}: BaseProps & {
  value: PickOption['value'][];
  onChange: (v: PickOption['value'][]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useFiltered(options, query, !!onSearch);
  const selected = options.filter((o) => value.includes(o.value));

  const toggle = (v: PickOption['value']) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={cn(triggerClass, 'flex-wrap', className)}>
          {selected.length ? (
            selected.map((o) => (
              <span
                key={o.value}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
              >
                {o.label}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(o.value);
                  }}
                />
              </span>
            ))
          ) : (
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-auto w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0" align="start">
        <SearchBox
          value={query}
          placeholder={searchPlaceholder}
          onChange={(q) => {
            setQuery(q);
            onSearch?.(q);
          }}
        />
        <OptionList
          options={filtered}
          loading={loading}
          emptyText={emptyText}
          isSelected={(v) => value.includes(v)}
          onPick={(o) => toggle(o.value)}
        />
      </PopoverContent>
    </Popover>
  );
}
