import { useEffect, useState } from 'react';
import { ordersApi } from '../../api/resources';
import type { Id, OrderItem } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { describeItemQty, isoToLocalInput, todayInput } from '../../lib/domain';
import { Button } from '../Button';
import { Field, inputClass } from '../Form';
import { Modal } from '../Modal';

interface Props {
  orderId: Id;
  item: OrderItem | null;
  onClose: () => void;
}

/** Devolución parcial: solo se puede BAJAR la cantidad (paquetes o g/u). */
export function PartialReturnModal({ orderId, item, onClose }: Props) {
  const [update] = ordersApi.useUpdate();
  const [qty, setQty] = useState('');
  useEffect(() => setQty(item ? String(Math.max(0, item.quantity - 1)) : ''), [item]);

  const n = Number(qty);
  const valid = !!item && qty !== '' && Number.isInteger(n) && n >= 0 && n < item.quantity;

  const [save, busy] = useAction(
    () => update(orderId, { editItem: [{ id: item!.id, quantity: n }] }),
    { success: 'Devolución registrada', error: 'No se pudo registrar la devolución' },
  );

  return (
    <Modal
      isOpen={!!item}
      onClose={busy ? () => {} : onClose}
      title="Devolución parcial"
      description={item ? `${item.productNameSnapshot} · ${item.variantNameSnapshot}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!valid} onClick={() => save().then(onClose).catch(() => undefined)}>
            Registrar devolución
          </Button>
        </>
      }
    >
      {item && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Cantidad actual: <strong className="text-foreground">{describeItemQty(item)}</strong>. Se repone la
            diferencia al stock, se prorratea el descuento y se recalcula el total.
          </p>
          <Field
            label={item.selectedBulkOption ? 'Nueva cantidad de paquetes' : 'Nueva cantidad'}
            hint={`Debe ser menor a ${item.quantity}.`}
            error={qty !== '' && !valid ? 'Cantidad inválida' : undefined}
          >
            <input
              type="number"
              min={0}
              max={item.quantity - 1}
              step={1}
              className={inputClass}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

/** Marca el ítem como AWAITING_STOCK con fecha estimada de llegada. */
export function AwaitingStockModal({ orderId, item, onClose }: Props) {
  const [update] = ordersApi.useUpdate();
  const [when, setWhen] = useState('');
  useEffect(() => {
    if (item) setWhen(item.awaitingStockAt ? isoToLocalInput(item.awaitingStockAt) : `${todayInput(3)}T12:00`);
  }, [item]);

  const date = when ? new Date(when) : null;
  const inPast = !!date && date.getTime() < Date.now();
  const valid = !!date && !Number.isNaN(date.getTime()) && !inPast;
  const minValue = isoToLocalInput(new Date().toISOString());

  const [save, busy] = useAction(
    () => update(orderId, { editItem: [{ id: item!.id, awaitingStockAt: date!.toISOString() }] }),
    { success: 'Ítem marcado como esperando stock', error: 'No se pudo actualizar el ítem' },
  );

  return (
    <Modal
      isOpen={!!item}
      onClose={busy ? () => {} : onClose}
      title="Marcar esperando stock"
      description={item ? `${item.productNameSnapshot} · ${item.variantNameSnapshot}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!valid} onClick={() => save().then(onClose).catch(() => undefined)}>
            Guardar
          </Button>
        </>
      }
    >
      <Field
        label="Fecha estimada de reposición"
        hint="La entrega estimada de la orden pasa a ser la fecha más lejana entre los ítems que esperan stock."
        error={inPast ? 'La fecha tiene que ser posterior a ahora.' : undefined}
      >
        <input type="datetime-local" className={inputClass} value={when} min={minValue} onChange={(e) => setWhen(e.target.value)} />
      </Field>
    </Modal>
  );
}
