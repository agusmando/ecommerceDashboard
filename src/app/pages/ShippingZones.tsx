import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Bike, MapPin, Pencil, Plus, Store } from 'lucide-react';
import {
  useCreateShippingZoneMutation,
  useShippingConfigQuery,
  useShippingZonesQuery,
  useUpdateShippingZoneMutation,
} from '../api/resources';
import type { ShippingZone, ShippingZoneInput } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { DataTable, stop, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { AffixInput, Field, FormGrid, SwitchRow, inputClass, num } from '../components/Form';
import { FormError, Skeleton } from '../components/States';
import { Switch } from '../components/ui/switch';
import { useAction } from '../hooks/useAction';
import { formatCurrency } from '../lib/utils';

/**
 * Tarifas propias de envío a domicilio por departamento. El cliente solo puede
 * elegir envío si su departamento tiene una zona activa.
 */
export default function ShippingZones() {
  const zones = useShippingZonesQuery();
  const config = useShippingConfigQuery();
  const [update] = useUpdateShippingZoneMutation();
  const [editing, setEditing] = useState<ShippingZone | 'new' | null>(null);

  const [toggle] = useAction(
    (z: ShippingZone, active: boolean) => update({ id: z.id, body: { active } }).unwrap(),
    { success: (z) => (z.active ? `${z.name}: envío habilitado` : `${z.name}: envío deshabilitado`), error: 'No se pudo actualizar la zona' },
  );

  const rows = zones.data ?? [];
  const activeCount = rows.filter((z) => z.active).length;
  const uber = config.data?.providers.uber;

  const columns: Column<ShippingZone>[] = [
    {
      key: 'name',
      header: 'Departamento',
      cell: (z) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="font-medium">{z.name}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Precio',
      align: 'right',
      cell: (z) => (
        <div className="flex items-center justify-end gap-2">
          {Number(z.price) === 0 && <Badge tone={z.active ? 'info' : 'warning'}>{z.active ? 'Gratis' : 'Sin precio'}</Badge>}
          <span className="tabular-nums">{formatCurrency(Number(z.price))}</span>
        </div>
      ),
    },
    {
      key: 'eta',
      header: 'Demora est.',
      align: 'right',
      hideOnMobile: true,
      cell: (z) =>
        z.etaMinutes ? <span className="tabular-nums">{z.etaMinutes} min</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'sort',
      header: 'Orden',
      align: 'right',
      hideOnMobile: true,
      cell: (z) => <span className="tabular-nums text-muted-foreground">{z.sortOrder}</span>,
    },
    {
      key: 'active',
      header: 'Activa',
      align: 'center',
      cell: (z) => (
        <div className="flex justify-center" onClick={stop}>
          <Switch
            checked={z.active}
            onCheckedChange={(v) => toggle(z, v).catch(() => undefined)}
            aria-label={z.active ? `Desactivar ${z.name}` : `Activar ${z.name}`}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (z) => (
        <Button size="sm" variant="ghost" onClick={(e) => {
            stop(e);
            setEditing(z);
          }} aria-label={`Editar ${z.name}`}>
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Editar</span>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tarifas de envío"
        description="Precio del envío a domicilio por departamento. El cliente solo puede elegir envío si su departamento está activo."
        backTo="/dashboard/shipments"
        backLabel="Envíos"
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" /> Nueva zona
          </Button>
        }
      />

      {!zones.isLoading && !zones.error && activeCount === 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
          <div>
            <div className="font-medium">Ninguna zona activa: los clientes no pueden elegir envío a domicilio.</div>
            <div className="text-xs opacity-90">Cargá el precio de cada departamento y activalo con el interruptor.</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-muted-foreground" /> Uber Direct
            </CardTitle>
            {config.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : config.error ? (
              <Badge tone="danger">No se pudo consultar</Badge>
            ) : (
              <Badge tone={uber ? 'success' : 'default'} dot>
                {uber ? 'Configurado' : 'No configurado'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Si Uber Direct está configurado, el costo se cotiza con Uber y estas tarifas quedan como respaldo.
            {uber === false &&
              ' Hoy se cobran estas tarifas y el envío se gestiona a mano (para habilitarlo hay que cargar las credenciales de Uber Direct en el servidor).'}
            {uber && ' Desde cada envío podés solicitar un repartidor.'}
          </p>
        </Card>
        <Card className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" /> Retiro en el local
          </CardTitle>
          {config.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : config.data?.pickup ? (
            <p className="text-sm">
              <span className="font-medium">{config.data.pickup.name}</span>
              <span className="block text-muted-foreground">{config.data.pickup.address}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          <p className="text-xs text-muted-foreground">Siempre disponible y sin costo. También es el punto de retiro del repartidor.</p>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={zones.data}
        rowKey={(z) => z.id}
        loading={zones.isLoading}
        fetching={zones.isFetching}
        error={zones.error}
        onRetry={zones.refetch}
        onRowClick={(z) => setEditing(z)}
        rowClassName={(z) => (z.active ? undefined : 'opacity-70')}
        empty={{
          icon: <MapPin className="w-6 h-6" />,
          title: 'No hay zonas cargadas',
          description: 'Agregá un departamento con su precio de envío.',
          action: (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" /> Nueva zona
            </Button>
          ),
        }}
      />
      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {activeCount} de {rows.length} departamentos activos. El “Orden” define cómo se listan en la tienda.
        </p>
      )}

      <ZoneModal
        zone={editing === 'new' ? null : editing}
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        nextSort={rows.reduce((m, z) => Math.max(m, z.sortOrder), 0) + 1}
      />
    </>
  );
}

interface FormState {
  name: string;
  price: string;
  etaMinutes: string;
  sortOrder: string;
  active: boolean;
}

function ZoneModal({
  zone,
  isOpen,
  onClose,
  nextSort,
}: {
  zone: ShippingZone | null;
  isOpen: boolean;
  onClose: () => void;
  nextSort: number;
}) {
  const [create] = useCreateShippingZoneMutation();
  const [update] = useUpdateShippingZoneMutation();
  const [form, setForm] = useState<FormState>({ name: '', price: '', etaMinutes: '', sortOrder: '', active: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm(
      zone
        ? {
            name: zone.name,
            price: String(Number(zone.price)),
            etaMinutes: zone.etaMinutes ? String(zone.etaMinutes) : '',
            sortOrder: String(zone.sortOrder),
            active: zone.active,
          }
        : { name: '', price: '', etaMinutes: '', sortOrder: String(nextSort), active: true },
    );
  }, [isOpen, zone, nextSort]);

  const [save, saving] = useAction(
    (body: ShippingZoneInput) => (zone ? update({ id: zone.id, body }).unwrap() : create(body).unwrap()),
    { success: zone ? 'Zona actualizada' : 'Zona creada', error: 'No se pudo guardar la zona' },
  );

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const price = num(form.price);
    const eta = num(form.etaMinutes);
    const sortOrder = num(form.sortOrder);
    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    if (price === undefined || !Number.isFinite(price) || price < 0) return setError('Ingresá un precio válido (0 o más).');
    if (eta !== undefined && (!Number.isInteger(eta) || eta <= 0)) return setError('La demora debe ser un número entero de minutos.');
    if (sortOrder !== undefined && !Number.isInteger(sortOrder)) return setError('El orden debe ser un número entero.');
    setError(null);
    save({
      name: form.name.trim(),
      price,
      etaMinutes: eta ?? null,
      active: form.active,
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    })
      .then(onClose)
      .catch(() => undefined);
  };

  const formId = 'shipping-zone-form';
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={zone ? `Editar ${zone.name}` : 'Nueva zona de envío'}
      description="Tarifa propia de envío a domicilio para un departamento."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <Field label="Departamento" required htmlFor="zone-name" hint="Debe coincidir con el departamento que elige el cliente.">
          <input
            id="zone-name"
            className={inputClass}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Godoy Cruz"
            maxLength={80}
            autoFocus={!zone}
          />
        </Field>
        <FormGrid cols={3}>
          <Field label="Precio" required htmlFor="zone-price">
            <AffixInput
              id="zone-price"
              prefix="$"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set({ price: e.target.value })}
            />
          </Field>
          <Field label="Demora est." htmlFor="zone-eta" hint="Opcional">
            <AffixInput
              id="zone-eta"
              suffix="min"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={form.etaMinutes}
              onChange={(e) => set({ etaMinutes: e.target.value })}
            />
          </Field>
          <Field label="Orden" htmlFor="zone-sort">
            <input
              id="zone-sort"
              className={inputClass}
              type="number"
              step={1}
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) => set({ sortOrder: e.target.value })}
            />
          </Field>
        </FormGrid>
        <SwitchRow
          label="Activa"
          description={
            form.active && num(form.price) === 0
              ? 'Con precio $0 el envío a este departamento es gratis.'
              : 'Si está inactiva, los clientes de este departamento no pueden elegir envío.'
          }
          checked={form.active}
          onChange={(active) => set({ active })}
        />
        <FormError>{error}</FormError>
      </form>
    </Modal>
  );
}
