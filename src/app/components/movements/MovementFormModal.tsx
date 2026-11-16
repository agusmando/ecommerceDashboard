import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { movementsApi, variantsApi } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import type { Id, MovementInput, ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { MOVEMENT_TYPE, formatQty } from '../../lib/domain';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { AffixInput, Field } from '../Form';
import { Segmented } from '../Filters';
import { FormError } from '../States';
import { MovementDateField, movementDateError, movementDateToIso } from './MovementDateField';
import { VariantPicker, variantLabel } from '../CatalogPickers';

type ManualType = MovementInput['type'];
const TYPES: ManualType[] = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Variante preseleccionada (p. ej. la del filtro actual). */
  defaultVariantId?: Id | null;
}

export function MovementFormModal({ isOpen, onClose, defaultVariantId }: Props) {
  const [create] = movementsApi.useCreate();
  const [variantId, setVariantId] = useState<Id | null>(null);
  const [picked, setPicked] = useState<ProductVariant | undefined>();
  const [type, setType] = useState<ManualType>('IN');
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [date, setDate] = useState('');

  // Datos frescos de la variante (stock actual) desde la cache compartida.
  const { data: fetched } = variantsApi.useOne(variantId);
  const variant = fetched ?? picked;

  useEffect(() => {
    if (!isOpen) return;
    setVariantId(defaultVariantId ?? null);
    setPicked(undefined);
    setType('IN');
    setSign('+');
    setAmount('');
    setError('');
    setDate('');
  }, [isOpen, defaultVariantId]);

  const measure = variant?.contentMeasure;
  const unit = measure === 'KG' ? 'g' : 'u';
  const abs = Math.abs(Number(amount) || 0);
  const negative = type === 'OUT' || (type === 'ADJUSTMENT' && sign === '-');
  const delta = negative ? -abs : abs;
  const resulting = variant ? variant.currentStock + delta : undefined;

  const [submit, busy] = useAction((body: MovementInput) => create(body), {
    success: 'Movimiento registrado',
    error: 'No se pudo registrar el movimiento',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!variantId) return setError('Elegí una variante.');
    if (!(abs > 0) || !Number.isInteger(abs)) return setError(`Ingresá una cantidad entera mayor a 0 (${unit}).`);
    const dateError = movementDateError(date);
    if (dateError) return setError(dateError);
    setError('');
    try {
      await submit({ productVariantId: variantId, quantity: delta, type, createdAt: movementDateToIso(date) });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Registrar movimiento"
      description="Cada movimiento actualiza el stock de la variante y queda en el historial."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" loading={busy}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}

        <Field
          label="Variante"
          required
          hint={variant ? `Stock actual: ${formatQty(variant.currentStock, measure)}` : undefined}
        >
          <VariantPicker
            value={variantId}
            selectedLabel={variant ? variantLabel(variant) : variantId ? `Variante #${variantId}` : undefined}
            onChange={(id, v) => {
              setVariantId(id);
              setPicked(v);
            }}
            onlyActive={false}
          />
        </Field>

        <Field label="Tipo" hint={MOVEMENT_TYPE[type].hint}>
          <Segmented<ManualType>
            value={type}
            onChange={setType}
            className="flex-wrap h-auto"
            options={TYPES.map((t) => ({ value: t, label: MOVEMENT_TYPE[t].label }))}
          />
        </Field>

        <Field label={`Cantidad (${unit})`} required hint={measure === 'KG' ? 'Productos por kilo: el stock se maneja en gramos.' : undefined}>
          <div className="flex gap-2">
            {type === 'ADJUSTMENT' && (
              <Segmented<'+' | '-'>
                value={sign}
                onChange={setSign}
                options={[
                  { value: '+', label: '+ Sumar' },
                  { value: '-', label: '− Restar' },
                ]}
              />
            )}
            <div className="flex-1">
              <AffixInput
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                prefix={negative ? '−' : '+'}
                suffix={unit}
                placeholder="0"
              />
            </div>
          </div>
        </Field>

        <MovementDateField value={date} onChange={setDate} />

        {variant && abs > 0 && (
          <div
            className={
              resulting! < 0
                ? 'flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive'
                : 'flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm'
            }
          >
            {resulting! < 0 ? <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" /> : <Info className="mt-0.5 w-4 h-4 shrink-0 text-muted-foreground" />}
            <div>
              Stock resultante: <strong>{formatQty(resulting, measure)}</strong>{' '}
              <span className="text-muted-foreground">
                ({formatQty(variant.currentStock, measure)} {negative ? '−' : '+'} {formatQty(abs, measure)})
              </span>
              {resulting! < 0 && <div className="mt-0.5">No hay stock suficiente: el servidor rechazará la salida.</div>}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Para fijar un stock absoluto (conteo de inventario) usá <strong>Inventario</strong>: genera un ajuste por la diferencia.
        </p>
      </form>
    </Modal>
  );
}
