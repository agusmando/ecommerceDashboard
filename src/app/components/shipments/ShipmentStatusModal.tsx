import { useEffect, useState, type FormEvent } from 'react';
import { useAddShipmentEventMutation } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import type { Shipment, ShipmentStatus } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { SHIPMENT_STATUS, shipmentActionLabel } from '../../lib/domain';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Field, Textarea, inputClass } from '../Form';
import { ShipmentStatusBadge } from '../Badge';
import { FormError } from '../States';
import { useShipmentTransitions } from './ShipmentParts';

const SIDE_EFFECT: Partial<Record<ShipmentStatus, string>> = {
  SHIPPED: 'Si la orden está en preparación pasa a Despachada.',
  READY_FOR_PICKUP: 'Si la orden está en preparación pasa a Despachada.',
  DELIVERED: 'La orden pasa a Entregada (si su estado lo permite).',
  CANCELLED: 'Estado final: el envío no podrá volver a moverse.',
  RETURNED: 'Estado final: el envío no podrá volver a moverse.',
};

interface Props {
  shipment: Shipment | null;
  isOpen: boolean;
  onClose: () => void;
  /** Estado preseleccionado (p. ej. desde un botón de acción rápida). */
  initial?: ShipmentStatus;
}

/** Cambio de estado con evento: solo ofrece las transiciones válidas para el método/estado actual. */
export function ShipmentStatusModal({ shipment, isOpen, onClose, initial }: Props) {
  const { next } = useShipmentTransitions();
  const [addEvent] = useAddShipmentEventMutation();
  const options = shipment ? next(shipment) : [];

  const [status, setStatus] = useState<ShipmentStatus | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStatus(initial && options.includes(initial) ? initial : options.length === 1 ? options[0] : '');
    setDescription('');
    setLocation('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial, shipment?.id, shipment?.status]);

  const [submit, busy] = useAction(
    (to: ShipmentStatus) =>
      addEvent({
        id: shipment!.id,
        body: { status: to, description: description.trim() || undefined, location: location.trim() || undefined },
      }).unwrap(),
    { success: (s) => `Envío ${s.trackingCode}: ${SHIPMENT_STATUS[s.status]?.label.toLowerCase() ?? s.status}`, error: 'No se pudo actualizar el estado' },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!status) return setError('Elegí el nuevo estado.');
    try {
      await submit(status);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!shipment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Actualizar estado"
      description={`Envío ${shipment.trackingCode}. Cada cambio queda en el historial que ve el cliente.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="shipment-status-form"
            loading={busy}
            disabled={!options.length}
            variant={status === 'CANCELLED' ? 'destructive' : 'primary'}
          >
            {status ? shipmentActionLabel(status, shipment.method) : 'Actualizar'}
          </Button>
        </>
      }
    >
      <form id="shipment-status-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError>{error}</FormError>}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Estado actual: <ShipmentStatusBadge status={shipment.status} />
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">El envío está en un estado final: no admite más cambios.</p>
        ) : (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Nuevo estado</legend>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
              {options.map((to) => (
                <button
                  key={to}
                  type="button"
                  role="radio"
                  aria-checked={status === to}
                  onClick={() => setStatus(to)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                    status === to ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-accent',
                  )}
                >
                  <div className="font-medium">{shipmentActionLabel(to, shipment.method)}</div>
                  <div className="text-xs text-muted-foreground">→ {SHIPMENT_STATUS[to]?.label ?? to}</div>
                </button>
              ))}
            </div>
            {status && SIDE_EFFECT[status] && <p className="mt-2 text-xs text-muted-foreground">{SIDE_EFFECT[status]}</p>}
          </fieldset>
        )}

        {options.length > 0 && (
          <>
            <Field label="Descripción" hint="Opcional. Visible en el seguimiento del cliente." htmlFor="ev-desc">
              <Textarea
                id="ev-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={status === 'FAILED_ATTEMPT' ? 'No había nadie en el domicilio' : 'Ej. Salió del local'}
              />
            </Field>
            <Field label="Ubicación" hint="Opcional." htmlFor="ev-loc">
              <input id="ev-loc" className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mendoza" />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
