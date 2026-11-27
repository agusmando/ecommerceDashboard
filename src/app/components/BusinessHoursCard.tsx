import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { useBusinessHoursQuery, useSaveBusinessHoursMutation } from '../api/resources';
import type { BusinessHour } from '../api/types';
import { getErrorMessage } from '../api/client';
import { useCan } from '../hooks/useCan';
import { Card, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Skeleton } from './States';

const DAY_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MAX_RANGES = 2;

const inputClass =
  'h-9 rounded-lg border border-border bg-background px-2 text-sm tabular-nums disabled:opacity-50 [color-scheme:light_dark]';
// Los input[type=time] tienen ancho intrínseco propio: dentro de la grilla de
// la franja ocupan su columna y nunca desbordan la card.
const timeInputClass = `${inputClass} w-full min-w-0`;

/**
 * Editor de los horarios de atención del local (`/settings/hours`). Se muestran
 * en la web (Contacto), en los mails transaccionales y en el seguimiento.
 * Solo visible para quien tiene `content.edit`.
 */
export function BusinessHoursCard() {
  const can = useCan();
  const allowed = can('content.edit');
  const { data, isLoading } = useBusinessHoursQuery(undefined, { skip: !allowed });
  const [save, { isLoading: saving }] = useSaveBusinessHoursMutation();

  const [days, setDays] = useState<BusinessHour[] | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.hours && !dirty) setDays(data.hours.map((h) => ({ ...h, ranges: h.ranges.map((r) => ({ ...r })) })));
  }, [data, dirty]);

  if (!allowed) return null;

  const patch = (day: number, fn: (h: BusinessHour) => BusinessHour) => {
    setDays((prev) => prev?.map((h) => (h.day === day ? fn(h) : h)) ?? prev);
    setDirty(true);
  };

  const onSave = async () => {
    if (!days) return;
    try {
      await save({ hours: days }).unwrap();
      setDirty(false);
      toast.success('Horarios guardados');
    } catch (e) {
      toast.error(getErrorMessage(e) || 'No se pudieron guardar los horarios');
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <CardTitle>Horarios del local</CardTitle>
            <p className="text-sm text-muted-foreground">
              Se muestran en la web, en los mails y en el seguimiento de pedidos. Hasta dos franjas por día (corte de
              almuerzo).
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty || !days}>
          Guardar horarios
        </Button>
      </CardHeader>

      {isLoading || !days ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {days.map((h) => (
            <li key={h.day} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex w-28 shrink-0 items-center justify-between gap-3 sm:justify-start">
                <span className="text-sm font-medium">{DAY_LABEL[h.day]}</span>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => patch(h.day, (d) => ({ ...d, closed: e.target.checked }))}
                    className="size-4 accent-primary"
                  />
                  Cerrado
                </label>
              </div>

              {h.closed ? (
                <span className="flex-1 text-sm text-muted-foreground">No atiende</span>
              ) : (
                // Siempre 2 slots: el día se ve igual tenga 1 o 2 franjas y los
                // controles quedan alineados entre días.
                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                  {Array.from({ length: MAX_RANGES }).map((_, i) => {
                    const r = h.ranges[i];
                    if (!r) {
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            patch(h.day, (d) => ({ ...d, ranges: [...d.ranges, { open: '16:00', close: '21:00' }] }))
                          }
                          className="flex h-9 items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs font-medium text-primary transition-colors hover:bg-muted/50"
                        >
                          <Plus className="size-3.5" /> Agregar franja
                        </button>
                      );
                    }
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2"
                      >
                        <input
                          type="time"
                          aria-label={`${DAY_LABEL[h.day]} apertura ${i + 1}`}
                          className={timeInputClass}
                          value={r.open}
                          onChange={(e) =>
                            patch(h.day, (d) => ({
                              ...d,
                              ranges: d.ranges.map((x, xi) => (xi === i ? { ...x, open: e.target.value } : x)),
                            }))
                          }
                        />
                        <span className="shrink-0 text-xs text-muted-foreground">a</span>
                        <input
                          type="time"
                          aria-label={`${DAY_LABEL[h.day]} cierre ${i + 1}`}
                          className={timeInputClass}
                          value={r.close}
                          onChange={(e) =>
                            patch(h.day, (d) => ({
                              ...d,
                              ranges: d.ranges.map((x, xi) => (xi === i ? { ...x, close: e.target.value } : x)),
                            }))
                          }
                        />
                        {h.ranges.length > 1 ? (
                          <button
                            type="button"
                            aria-label={`Quitar franja ${i + 1} de ${DAY_LABEL[h.day]}`}
                            onClick={() => patch(h.day, (d) => ({ ...d, ranges: d.ranges.filter((_, xi) => xi !== i) }))}
                            className="btn-icon size-8 shrink-0 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : (
                          // Reserva el lugar del botón para que la fila no cambie de alto.
                          <span className="size-8 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
