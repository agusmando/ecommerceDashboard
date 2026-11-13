import { useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, MapPin } from 'lucide-react';
import { useShipmentMetaQuery } from '../../api/resources';
import {
  SHIPMENT_FINAL_STATUSES,
  SHIPMENT_TRANSITIONS,
  type Shipment,
  type ShipmentEvent,
} from '../../api/types';
import { SHIPMENT_STATUS } from '../../lib/domain';
import { cn, formatDateTime } from '../../lib/utils';

/**
 * Transiciones válidas para un envío según su método y estado. Usa
 * `GET /shipment/meta` (fuente de verdad) y, mientras carga, el espejo local.
 */
export function useShipmentTransitions() {
  const { data: meta } = useShipmentMetaQuery();
  const next = useCallback(
    (s: Pick<Shipment, 'method' | 'status'>) => {
      const finals = meta?.finalStatuses ?? SHIPMENT_FINAL_STATUSES;
      if (finals.includes(s.status)) return [];
      const table = meta?.transitions ?? SHIPMENT_TRANSITIONS;
      return table[s.method]?.[s.status] ?? [];
    },
    [meta],
  );
  const isFinal = useCallback(
    (s: Pick<Shipment, 'status'>) => (meta?.finalStatuses ?? SHIPMENT_FINAL_STATUSES).includes(s.status),
    [meta],
  );
  return { next, isFinal };
}

/** Código con botón para copiar al portapapeles. */
export function CopyCode({ value, className }: { value: string; className?: string }) {
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar el código');
    }
  };
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-mono text-sm font-medium">{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar código ${value}`}
        title="Copiar"
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

const DOT: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  violet: 'bg-violet-500',
  default: 'bg-muted-foreground/60',
};

/** Línea de tiempo del envío (más reciente arriba). */
export function ShipmentTimeline({ events, compact }: { events: ShipmentEvent[]; compact?: boolean }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>;
  const list = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <ol className="relative space-y-4" aria-label="Historial del envío">
      {list.map((ev, i) => {
        const s = SHIPMENT_STATUS[ev.status] ?? { label: ev.status, tone: 'default' };
        return (
          <li key={ev.id} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-card',
                  i === 0 ? DOT[s.tone] : 'bg-border',
                )}
              />
              {i < list.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className={cn('min-w-0 pb-1', compact && 'text-sm')}>
              <div className={cn('text-sm', i === 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
                {s.label}
              </div>
              <div className="text-xs text-muted-foreground">{formatDateTime(ev.createdAt)}</div>
              {ev.description && <p className="mt-0.5 text-sm text-foreground/90 break-words">{ev.description}</p>}
              {ev.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {ev.location}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "Calle 123, Ciudad, Provincia (CP)". */
export function formatShipmentAddress(s: Pick<Shipment, 'address' | 'city' | 'province' | 'postalCode'>) {
  const place = [s.city, s.province].filter(Boolean).join(', ');
  const parts = [s.address, place].filter(Boolean).join(', ');
  return parts ? `${parts}${s.postalCode ? ` (CP ${s.postalCode})` : ''}` : '';
}
