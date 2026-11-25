import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { discountCodesApi } from '../../api/resources';
import { COUPON_TYPES, type CouponType, type DiscountCode, type DiscountCodeInput } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { getErrorMessage } from '../../api/client';
import { COUPON_TYPE, describeCoupon, isoToLocalInput } from '../../lib/domain';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { AffixInput, Field, FormGrid, inputClass, num } from '../Form';
import { Segmented } from '../Filters';
import { FormError } from '../States';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  coupon?: DiscountCode | null;
}

export function DiscountCodeFormModal({ isOpen, onClose, coupon }: Props) {
  const editing = !!coupon;
  const [create] = discountCodesApi.useCreate();
  const [update] = discountCodesApi.useUpdate();

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CouponType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [start, setStart] = useState('');
  const [finish, setFinish] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description ?? '');
      setType(coupon.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE');
      setValue(coupon.discountValue?.toString() ?? '');
      setMaxAmount(coupon.maxDiscountAmount?.toString() ?? '');
      setMinOrder(coupon.minOrderAmount ? coupon.minOrderAmount.toString() : '');
      setUsageLimit(coupon.usageLimit?.toString() ?? '');
      setPerUserLimit(coupon.perUserLimit?.toString() ?? '');
      setStart(isoToLocalInput(coupon.startTime));
      setFinish(isoToLocalInput(coupon.finishTime));
    } else {
      setCode('');
      setDescription('');
      setType('PERCENTAGE');
      setValue('');
      setMaxAmount('');
      setMinOrder('');
      setUsageLimit('');
      setPerUserLimit('');
      const now = new Date();
      setStart(isoToLocalInput(now.toISOString()));
      setFinish(isoToLocalInput(new Date(now.getTime() + 30 * 86400000).toISOString()));
    }
  }, [isOpen, coupon]);

  const body = useMemo((): DiscountCodeInput => {
    const b: DiscountCodeInput = {
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      discountType: type,
      discountValue: num(value) ?? 0,
      startTime: start ? new Date(start).toISOString() : '',
      finishTime: finish ? new Date(finish).toISOString() : '',
    };
    const max = num(maxAmount);
    if (max !== undefined) b.maxDiscountAmount = max;
    const min = num(minOrder);
    if (min !== undefined) b.minOrderAmount = min;
    const usage = num(usageLimit);
    if (usage !== undefined) b.usageLimit = usage;
    const perUser = num(perUserLimit);
    if (perUser !== undefined) b.perUserLimit = perUser;
    return b;
  }, [code, description, type, value, maxAmount, minOrder, usageLimit, perUserLimit, start, finish]);

  const preview = describeCoupon({
    discountType: type,
    discountValue: num(value) ?? 0,
    maxDiscountAmount: type === 'PERCENTAGE' ? num(maxAmount) ?? null : null,
  });

  const validate = (): string => {
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(body.code)) {
      return 'El código debe tener entre 3 y 40 caracteres: letras, números, guion o guion bajo.';
    }
    if (!(body.discountValue > 0)) return 'Ingresá el valor del descuento.';
    if (type === 'PERCENTAGE' && body.discountValue > 100) return 'El porcentaje no puede superar 100.';
    if (!start || !finish) return 'Completá las fechas de vigencia.';
    if (new Date(finish) <= new Date(start)) return 'La fecha de fin debe ser posterior al inicio.';
    for (const [label, raw] of [
      ['El tope', maxAmount],
      ['La compra mínima', minOrder],
    ] as const) {
      if (raw.trim() !== '' && !(Number(raw) >= 0)) return `${label} debe ser mayor o igual a 0.`;
    }
    for (const [label, raw] of [
      ['El límite total', usageLimit],
      ['El límite por cliente', perUserLimit],
    ] as const) {
      if (raw.trim() !== '' && !(Number.isInteger(Number(raw)) && Number(raw) > 0)) {
        return `${label} debe ser un entero mayor a 0 (o vacío para ilimitado).`;
      }
    }
    return '';
  };

  const [submit, busy] = useAction(
    async () => (editing ? update(coupon!.id, body) : create(body)),
    { success: editing ? 'Código actualizado' : 'Código creado', error: 'No se pudo guardar el código' },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    try {
      await submit();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={editing ? `Editar código ${coupon!.code}` : 'Nuevo código de descuento'}
      description="El cliente lo escribe en el checkout o en /ofertas. Descuenta sobre el subtotal de productos (sin envío)."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="coupon-form" loading={busy}>
            {editing ? 'Guardar cambios' : 'Crear código'}
          </Button>
        </>
      }
    >
      <form id="coupon-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError>{error}</FormError>}

        <FormGrid>
          <Field label="Código" required hint="Se guarda en mayúsculas. Mínimo 3 caracteres.">
            <input
              className={`${inputClass} uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. VERANO10"
              autoComplete="off"
            />
          </Field>
          <Field label="Descripción" hint="Uso interno, no lo ve el cliente.">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaña de verano"
            />
          </Field>
        </FormGrid>

        <Field label="Tipo de descuento" hint={COUPON_TYPE[type]?.label}>
          <Segmented
            value={type}
            onChange={setType}
            options={COUPON_TYPES.map((t) => ({ value: t, label: COUPON_TYPE[t].label }))}
          />
        </Field>

        <FormGrid cols={3}>
          <Field label={type === 'PERCENTAGE' ? 'Descuento' : 'Monto fijo'} required>
            <AffixInput
              type="number"
              min={0}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              prefix={type === 'FIXED' ? '$' : undefined}
              suffix={type === 'PERCENTAGE' ? '%' : undefined}
            />
          </Field>
          {type === 'PERCENTAGE' && (
            <Field label="Tope del descuento" hint="Opcional: máximo a descontar.">
              <AffixInput type="number" min={0} step="any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} prefix="$" placeholder="Sin tope" />
            </Field>
          )}
          <Field label="Compra mínima" hint="Subtotal mínimo de productos.">
            <AffixInput type="number" min={0} step="any" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} prefix="$" placeholder="Sin mínimo" />
          </Field>
          <Field label="Límite total de usos" hint="Vacío = ilimitado.">
            <AffixInput type="number" min={1} step={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Ilimitado" />
          </Field>
          <Field label="Límite por cliente" hint="Vacío = ilimitado.">
            <AffixInput type="number" min={1} step={1} value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} placeholder="Ilimitado" />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="Inicio" required>
            <input type="datetime-local" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin" required>
            <input type="datetime-local" className={inputClass} value={finish} onChange={(e) => setFinish(e.target.value)} />
          </Field>
        </FormGrid>

        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
          <div>
            <span className="text-muted-foreground">Vista previa: </span>
            <strong className="text-foreground">{preview}</strong>
            <span className="text-muted-foreground"> sobre el subtotal de productos.</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
