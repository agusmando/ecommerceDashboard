import { useEffect, useState, type FormEvent } from 'react';
import { shipmentsApi } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import { SHIPMENT_METHODS, type Id, type Shipment, type ShipmentFields, type ShipmentMethod } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { SHIPMENT_METHOD } from '../../lib/domain';
import { formatOrderNumber } from '../../lib/utils';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { AffixInput, Field, FormGrid, FormSection, Textarea, inputClass, num } from '../Form';
import { Segmented } from '../Filters';
import { FormError } from '../States';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Alta: orden a la que se le crea el envío. */
  orderId?: Id;
  /** Edición. */
  shipment?: Shipment | null;
  /** Valores sugeridos para el alta (p. ej. nombre del cliente). */
  suggested?: { recipientName?: string | null; method?: ShipmentMethod | null; cost?: number | null };
  onCreated?: (s: Shipment) => void;
}

const TEXT_FIELDS = [
  'carrier',
  'carrierTrackingCode',
  'carrierTrackingUrl',
  'recipientName',
  'phone',
  'address',
  'city',
  'province',
  'postalCode',
  'notes',
] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type TextValues = Record<TextField, string>;

const EMPTY: TextValues = Object.fromEntries(TEXT_FIELDS.map((k) => [k, ''])) as TextValues;

/** ISO → `YYYY-MM-DD` local. */
function isoToDay(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `YYYY-MM-DD` → ISO a mediodía local (evita corrimientos de día por zona horaria). */
const dayToNoonIso = (day: string) => (day ? new Date(`${day}T12:00:00`).toISOString() : null);

export function ShipmentFormModal({ isOpen, onClose, orderId, shipment, suggested, onCreated }: Props) {
  const editing = !!shipment;
  const [create] = shipmentsApi.useCreate();
  const [update] = shipmentsApi.useUpdate();

  const [method, setMethod] = useState<ShipmentMethod>('DELIVERY');
  const [values, setValues] = useState<TextValues>(EMPTY);
  const [cost, setCost] = useState('');
  const [eta, setEta] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (shipment) {
      setMethod(shipment.method);
      setValues(Object.fromEntries(TEXT_FIELDS.map((k) => [k, shipment[k] ?? ''])) as TextValues);
      setCost(shipment.cost ? String(shipment.cost) : '');
      setEta(isoToDay(shipment.estimatedDeliveryAt));
    } else {
      setMethod(suggested?.method ?? 'DELIVERY');
      setValues({ ...EMPTY, recipientName: suggested?.recipientName ?? '' });
      setCost(suggested?.cost ? String(suggested.cost) : '');
      setEta('');
    }
  }, [isOpen, shipment, suggested?.recipientName, suggested?.method, suggested?.cost]);

  const set = (k: TextField) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const buildBody = (): ShipmentFields => {
    const body: ShipmentFields = { method };
    TEXT_FIELDS.forEach((k) => {
      const v = values[k].trim();
      // Al editar, vacío = borrar el dato (null); en el alta simplemente no se manda.
      if (v) body[k] = v;
      else if (editing && shipment?.[k]) body[k] = null;
    });
    body.cost = num(cost) ?? 0;
    const etaIso = dayToNoonIso(eta);
    if (etaIso) body.estimatedDeliveryAt = etaIso;
    else if (editing && shipment?.estimatedDeliveryAt) body.estimatedDeliveryAt = null;
    return body;
  };

  const validate = () => {
    if (method === 'DELIVERY' && !values.address.trim()) return 'Para un envío a domicilio la dirección es obligatoria.';
    if (Number(num(cost) ?? 0) < 0) return 'El costo no puede ser negativo.';
    const url = values.carrierTrackingUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) return 'El link de seguimiento debe empezar con http:// o https://';
    return '';
  };

  const [submit, busy] = useAction(
    async () => {
      const body = buildBody();
      if (editing) return update(shipment!.id, body);
      return create({ ...body, orderId: orderId!, method });
    },
    { success: editing ? 'Envío actualizado' : 'Envío creado', error: 'No se pudo guardar el envío' },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    try {
      const saved = await submit();
      if (!editing) onCreated?.(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const delivery = method === 'DELIVERY';
  const targetOrder = shipment?.orderId ?? orderId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={editing ? `Editar envío ${shipment!.trackingCode}` : 'Crear envío'}
      description={targetOrder ? `Orden ${formatOrderNumber(targetOrder)}. El estado se cambia desde “Actualizar estado”.` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="shipment-form" loading={busy}>
            {editing ? 'Guardar cambios' : 'Crear envío'}
          </Button>
        </>
      }
    >
      <form id="shipment-form" onSubmit={handleSubmit} className="space-y-6">
        {error && <FormError>{error}</FormError>}

        <Field label="Modalidad" required>
          <Segmented
            value={method}
            onChange={setMethod}
            options={SHIPMENT_METHODS.map((m) => ({ value: m, label: SHIPMENT_METHOD[m] }))}
          />
          {editing && method !== shipment!.method && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Cambiar la modalidad cambia los estados disponibles del envío.
            </p>
          )}
        </Field>

        <FormSection title="Destinatario">
          <FormGrid>
            <Field label="Nombre" htmlFor="sh-recipient">
              <input id="sh-recipient" className={inputClass} value={values.recipientName} onChange={set('recipientName')} />
            </Field>
            <Field label="Teléfono" htmlFor="sh-phone">
              <input id="sh-phone" type="tel" className={inputClass} value={values.phone} onChange={set('phone')} />
            </Field>
          </FormGrid>
          {delivery && (
            <>
              <Field label="Dirección" htmlFor="sh-address" required>
                <input
                  id="sh-address"
                  className={inputClass}
                  value={values.address}
                  onChange={set('address')}
                  placeholder="Calle, número, piso/depto"
                />
              </Field>
              <FormGrid cols={3}>
                <Field label="Ciudad" htmlFor="sh-city">
                  <input id="sh-city" className={inputClass} value={values.city} onChange={set('city')} placeholder="Mendoza" />
                </Field>
                <Field label="Provincia" htmlFor="sh-province">
                  <input id="sh-province" className={inputClass} value={values.province} onChange={set('province')} placeholder="Mendoza" />
                </Field>
                <Field label="Código postal" htmlFor="sh-cp">
                  <input id="sh-cp" className={inputClass} value={values.postalCode} onChange={set('postalCode')} />
                </Field>
              </FormGrid>
            </>
          )}
        </FormSection>

        <FormSection
          title={delivery ? 'Transporte' : 'Retiro'}
          description={delivery ? 'No hay integración con transportistas: completá los datos a mano.' : undefined}
        >
          {delivery && (
            <FormGrid>
              <Field label="Transportista" htmlFor="sh-carrier">
                <input
                  id="sh-carrier"
                  className={inputClass}
                  value={values.carrier}
                  onChange={set('carrier')}
                  placeholder="Envío propio, Andreani…"
                  list="sh-carriers"
                />
                <datalist id="sh-carriers">
                  <option value="Envío propio" />
                  <option value="Andreani" />
                  <option value="Correo Argentino" />
                  <option value="OCA" />
                </datalist>
              </Field>
              <Field label="Código del transportista" htmlFor="sh-ctc">
                <input id="sh-ctc" className={inputClass} value={values.carrierTrackingCode} onChange={set('carrierTrackingCode')} />
              </Field>
              <Field label="Link de seguimiento del transportista" htmlFor="sh-ctu" className="sm:col-span-2">
                <input
                  id="sh-ctu"
                  type="url"
                  className={inputClass}
                  value={values.carrierTrackingUrl}
                  onChange={set('carrierTrackingUrl')}
                  placeholder="https://…"
                />
              </Field>
            </FormGrid>
          )}
          <FormGrid>
            <Field label={delivery ? 'Costo de envío' : 'Costo'} htmlFor="sh-cost">
              <AffixInput id="sh-cost" type="number" min={0} step="any" prefix="$" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
            </Field>
            <Field label={delivery ? 'Entrega estimada' : 'Retiro estimado'} htmlFor="sh-eta">
              <input id="sh-eta" type="date" className={inputClass} value={eta} onChange={(e) => setEta(e.target.value)} />
            </Field>
          </FormGrid>
          <Field label="Notas internas" htmlFor="sh-notes">
            <Textarea id="sh-notes" value={values.notes} onChange={set('notes')} placeholder="Horario de entrega, referencias…" />
          </Field>
        </FormSection>
      </form>
    </Modal>
  );
}
