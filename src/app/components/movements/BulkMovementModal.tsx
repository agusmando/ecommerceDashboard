import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useCreateMovementsBulkMutation } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import type { Id, MovementInput, ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { MOVEMENT_TYPE, formatQty } from '../../lib/domain';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { inputClass } from '../Form';
import { FormError } from '../States';
import { VariantPicker, variantLabel } from '../CatalogPickers';
import { MovementDateField, movementDateError, movementDateToIso } from './MovementDateField';

type ManualType = MovementInput['type'];
const TYPES: ManualType[] = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];
const MAX_ROWS = 200;

interface Row {
  key: number;
  variantId: Id | null;
  variant?: ProductVariant;
  type: ManualType;
  /** Solo para ajustes: sumar o restar. */
  sign: '+' | '-';
  amount: string;
}

let nextKey = 1;
const newRow = (type: ManualType = 'IN'): Row => ({ key: nextKey++, variantId: null, type, sign: '+', amount: '' });

const isEmpty = (r: Row) => !r.variantId && !r.amount.trim();
const deltaOf = (r: Row) => {
  const abs = Math.abs(Number(r.amount) || 0);
  return r.type === 'OUT' || (r.type === 'ADJUSTMENT' && r.sign === '-') ? -abs : abs;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Carga masiva de movimientos manuales (ingresos, salidas, ajustes y
 * devoluciones). Se registran todos juntos: si una fila falla, no se guarda ninguno.
 */
export function BulkMovementModal({ isOpen, onClose }: Props) {
  const [createBulk] = useCreateMovementsBulkMutation();
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [error, setError] = useState('');
  const [errorRow, setErrorRow] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const amountRefs = useRef(new Map<number, HTMLInputElement>());
  const focusKey = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRows([newRow()]);
    setError('');
    setErrorRow(null);
    setDate('');
  }, [isOpen]);

  // Foco en la cantidad de la fila recién agregada / recién elegida
  useEffect(() => {
    if (focusKey.current === null) return;
    amountRefs.current.get(focusKey.current)?.focus();
    focusKey.current = null;
  });

  const update = (key: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setErrorRow(null);
  };
  const addRow = () =>
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, newRow(prev[prev.length - 1]?.type ?? 'IN')]));
  const removeRow = (key: number) => setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((r) => r.key !== key)));

  /** Stock resultante por fila, acumulando las filas anteriores de la misma variante. */
  const preview = useMemo(() => {
    const running = new Map<Id, number>();
    return rows.map((r) => {
      if (!r.variant || !(Math.abs(Number(r.amount)) > 0)) return null;
      const start = running.get(r.variant.id) ?? (Number(r.variant.currentStock) || 0);
      const after = start + deltaOf(r);
      running.set(r.variant.id, after);
      return after;
    });
  }, [rows]);

  const filled = rows.filter((r) => !isEmpty(r));
  const dirty = filled.length > 0;

  const [submit, busy] = useAction((body: MovementInput[]) => createBulk(body).unwrap(), {
    success: (r) => `${r.count} ${r.count === 1 ? 'movimiento registrado' : 'movimientos registrados'}`,
    error: 'No se pudieron registrar los movimientos',
  });

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('¿Descartar los movimientos cargados?')) return;
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorRow(null);
    const dateError = movementDateError(date);
    if (dateError) return setError(dateError);
    const createdAt = movementDateToIso(date);
    // Validación local (las filas totalmente vacías se ignoran)
    const body: MovementInput[] = [];
    for (const [i, r] of rows.entries()) {
      if (isEmpty(r)) continue;
      const amount = Number(r.amount);
      const problem = !r.variantId
        ? 'elegí una variante'
        : !(Math.abs(amount) > 0) || !Number.isInteger(amount)
          ? 'ingresá una cantidad entera mayor a 0'
          : null;
      if (problem) {
        setErrorRow(i + 1);
        return setError(`Fila ${i + 1}: ${problem}.`);
      }
      body.push({ productVariantId: r.variantId!, type: r.type, quantity: deltaOf(r), createdAt });
    }
    if (!body.length) return setError('Cargá al menos un movimiento.');
    try {
      await submit(body);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      // El backend indica "Fila N: ..." contando solo las filas enviadas
      const n = Number(/^Fila (\d+)/.exec(message)?.[1]);
      if (n > 0) {
        const sent = rows.map((r, i) => (isEmpty(r) ? null : i + 1)).filter(Boolean) as number[];
        setErrorRow(sent[n - 1] ?? null);
      }
    }
  };

  const negativeRows = preview.filter((p) => p !== null && p < 0).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="xl"
      title="Carga masiva de movimientos"
      description="Cargá varios movimientos de una vez. Se registran todos juntos: si alguno falla, no se guarda ninguno."
      footer={
        <>
          <span className="mr-auto text-sm text-muted-foreground">
            {filled.length} {filled.length === 1 ? 'movimiento' : 'movimientos'}
          </span>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="bulk-movement-form" loading={busy} disabled={!filled.length}>
            Registrar {filled.length > 0 ? filled.length : ''} {filled.length === 1 ? 'movimiento' : 'movimientos'}
          </Button>
        </>
      }
    >
      <form id="bulk-movement-form" onSubmit={handleSubmit} className="space-y-3">
        {error && <FormError>{error}</FormError>}

        <div className="max-w-sm">
          <MovementDateField
            value={date}
            onChange={setDate}
            label="Fecha de los movimientos"
            hint="Se aplica a todas las filas. Vacía = fecha y hora actual (útil para cargar un remito de otro día)."
          />
        </div>

        {/* Encabezados (solo escritorio) */}
        <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[2rem_minmax(0,1fr)_9.5rem_11rem_8rem_2.25rem]">
          <span>#</span>
          <span>Variante</span>
          <span>Tipo</span>
          <span>Cantidad</span>
          <span className="text-right">Stock resultante</span>
          <span />
        </div>

        <ol className="space-y-2">
          {rows.map((r, i) => {
            const unit = r.variant?.contentMeasure === 'KG' ? 'g' : 'u';
            const after = preview[i];
            const negative = deltaOf(r) < 0;
            return (
              <li
                key={r.key}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_2.25rem] items-start gap-2 rounded-lg border p-2 md:grid-cols-[2rem_minmax(0,1fr)_9.5rem_11rem_8rem_2.25rem] md:items-center md:border-transparent md:p-1',
                  errorRow === i + 1 ? 'border-destructive bg-destructive/5 md:border-destructive' : 'border-border',
                )}
              >
                <span className="hidden text-sm tabular-nums text-muted-foreground md:block">{i + 1}</span>

                <div className="min-w-0">
                  <span className="mb-1 block text-xs text-muted-foreground md:hidden">Fila {i + 1} · Variante</span>
                  <VariantPicker
                    value={r.variantId}
                    selectedLabel={r.variant ? variantLabel(r.variant) : undefined}
                    onChange={(id, v) => {
                      update(r.key, { variantId: id, variant: v });
                      if (id) focusKey.current = r.key;
                    }}
                    placeholder="Buscar producto o variante…"
                    onlyActive={false}
                  />
                </div>

                {/* Botón quitar: en mobile va al lado de la variante */}
                <button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  aria-label={`Quitar fila ${i + 1}`}
                  className="mt-5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive md:order-last md:mt-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="col-span-2 grid grid-cols-2 gap-2 md:contents">
                  <label className="min-w-0">
                    <span className="mb-1 block text-xs text-muted-foreground md:hidden">Tipo</span>
                    <select
                      className={inputClass}
                      value={r.type}
                      onChange={(e) => update(r.key, { type: e.target.value as ManualType })}
                      aria-label={`Tipo de la fila ${i + 1}`}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {MOVEMENT_TYPE[t].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-0">
                    <span className="mb-1 block text-xs text-muted-foreground md:hidden">Cantidad ({unit})</span>
                    <div className="flex items-center gap-1">
                      {r.type === 'ADJUSTMENT' ? (
                        <button
                          type="button"
                          onClick={() => update(r.key, { sign: r.sign === '+' ? '-' : '+' })}
                          className="h-9 w-9 shrink-0 rounded-md border border-border font-semibold hover:bg-accent"
                          aria-label={r.sign === '+' ? 'Sumar (tocar para restar)' : 'Restar (tocar para sumar)'}
                          title="Sumar / restar"
                        >
                          {r.sign === '+' ? '+' : '−'}
                        </button>
                      ) : (
                        <span className="w-4 shrink-0 text-center text-sm text-muted-foreground" aria-hidden>
                          {negative ? '−' : '+'}
                        </span>
                      )}
                      <input
                        ref={(el) => {
                          if (el) amountRefs.current.set(r.key, el);
                          else amountRefs.current.delete(r.key);
                        }}
                        className={cn(inputClass, 'min-w-0 tabular-nums')}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        placeholder="0"
                        value={r.amount}
                        onChange={(e) => update(r.key, { amount: e.target.value.replace('-', '') })}
                        onKeyDown={(e) => {
                          // Enter en la última fila agrega otra
                          if (e.key === 'Enter' && i === rows.length - 1 && r.variantId && r.amount) {
                            e.preventDefault();
                            addRow();
                          }
                        }}
                        aria-label={`Cantidad de la fila ${i + 1}`}
                      />
                      <span className="w-4 shrink-0 text-xs text-muted-foreground">{unit}</span>
                    </div>
                  </label>
                </div>

                <div
                  className={cn(
                    'col-span-2 text-xs tabular-nums md:col-span-1 md:text-right md:text-sm',
                    after !== null && after < 0 ? 'font-medium text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {after === null || after === undefined ? (
                    <span className="hidden md:inline">—</span>
                  ) : (
                    <>
                      <span className="md:hidden">Stock resultante: </span>
                      {formatQty(after, r.variant?.contentMeasure)}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
            <Plus className="w-4 h-4" /> Agregar fila
          </Button>
          <p className="text-xs text-muted-foreground">
            Productos por kilo en gramos. Enter en la cantidad de la última fila agrega otra.
          </p>
        </div>

        {negativeRows > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
            {negativeRows === 1 ? 'Una fila deja' : `${negativeRows} filas dejan`} el stock en negativo: el servidor va a rechazar la carga.
          </div>
        )}
      </form>
    </Modal>
  );
}
