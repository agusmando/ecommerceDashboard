import { CalendarClock, X } from 'lucide-react';
import { Field, inputClass } from '../Form';

/** `YYYY-MM-DDTHH:mm` en hora local (formato de <input type="datetime-local">). */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Valor del campo → ISO para la API (`undefined` = ahora). */
export const movementDateToIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

/** Error de validación del lado del panel (el backend vuelve a validar). */
export function movementDateError(value: string): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return 'La fecha no es válida.';
  if (t > Date.now() + 5 * 60_000) return 'La fecha no puede ser futura.';
  if (t < Date.now() - 366 * 86_400_000) return 'La fecha no puede tener más de un año.';
  return null;
}

/** Fecha opcional del movimiento: vacío = ahora. Para cargar movimientos de días anteriores. */
export function MovementDateField({
  value,
  onChange,
  label = 'Fecha',
  hint = 'Dejala vacía para usar la fecha y hora actual.',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
}) {
  const now = new Date();
  const min = new Date(now.getTime() - 365 * 86_400_000);
  const error = movementDateError(value);
  return (
    <Field label={label} htmlFor="movement-date" hint={hint} error={error ?? undefined}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="movement-date"
            type="datetime-local"
            value={value}
            max={toLocalInput(now)}
            min={toLocalInput(min)}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} pl-9`}
            aria-invalid={!!error || undefined}
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 rounded-lg border border-border px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Usar fecha actual"
            title="Usar fecha actual"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Field>
  );
}
