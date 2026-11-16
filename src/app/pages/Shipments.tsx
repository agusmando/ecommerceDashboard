import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, Eye, Hash, MapPinned, Pencil, RefreshCw, Truck } from 'lucide-react';
import { shipmentsApi } from '../api/resources';
import { SHIPMENT_METHODS, SHIPMENT_STATUSES, type Shipment, type ShipmentMethod, type ShipmentStatus } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { SHIPMENT_METHOD, SHIPMENT_STATUS, uberStatus } from '../lib/domain';
import { formatDate, formatDateTime, formatOrderNumber } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { DataTable, stop, type Column } from '../components/DataTable';
import { FilterBar, FilterSelect, SearchInput, Segmented } from '../components/Filters';
import { Badge, ShipmentStatusBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { CopyCode, formatShipmentAddress, useShipmentTransitions } from '../components/shipments/ShipmentParts';
import { ShipmentFormModal } from '../components/shipments/ShipmentFormModal';
import { ShipmentStatusModal } from '../components/shipments/ShipmentStatusModal';

const DEFAULTS = {
  status: '' as ShipmentStatus | '',
  method: '' as ShipmentMethod | '',
  trackingCode: '',
  orderId: '',
  carrier: '',
};

export default function Shipments() {
  const navigate = useNavigate();
  const f = useListFilters('shipments', DEFAULTS, { textKeys: ['trackingCode', 'orderId', 'carrier'] });
  const d = f.debounced;
  const { next } = useShipmentTransitions();
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [moving, setMoving] = useState<Shipment | null>(null);

  const orderId = Number(String(d.orderId).replace(/\D/g, ''));
  const { data, isLoading, isFetching, error, refetch } = shipmentsApi.usePage({
    detalle: true,
    status: d.status,
    method: d.method,
    trackingCode: d.trackingCode.trim(),
    carrier: d.carrier.trim(),
    orderId: orderId > 0 ? orderId : '',
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });

  const open = (s: Shipment) => navigate(`/dashboard/shipments/${s.id}`);

  const columns: Column<Shipment>[] = [
    {
      key: 'code',
      header: 'Seguimiento',
      cell: (s) => (
        <div onClick={stop}>
          <CopyCode value={s.trackingCode} />
          <div className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Orden',
      cell: (s) => (
        <Link
          to={`/dashboard/orders/${s.orderId}`}
          onClick={stop}
          className="inline-flex items-center gap-0.5 font-medium tabular-nums text-primary hover:underline"
        >
          {formatOrderNumber(s.orderId)}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
    {
      key: 'recipient',
      header: 'Destinatario',
      hideOnMobile: true,
      cell: (s) => {
        const who = s.recipientName || s.order?.user?.name || s.order?.user?.email;
        const where = s.method === 'DELIVERY' ? formatShipmentAddress(s) : '';
        return (
          <div className="max-w-56 min-w-0">
            <div className="truncate">{who || <span className="text-muted-foreground">—</span>}</div>
            {where && <div className="truncate text-xs text-muted-foreground" title={where}>{where}</div>}
          </div>
        );
      },
    },
    {
      key: 'method',
      header: 'Modalidad',
      cell: (s) => <Badge tone={s.method === 'DELIVERY' ? 'info' : 'violet'}>{SHIPMENT_METHOD[s.method] ?? s.method}</Badge>,
    },
    {
      key: 'carrier',
      header: 'Transportista',
      hideOnMobile: true,
      cell: (s) =>
        s.carrier ? (
          <div className="min-w-0">
            <div className="truncate">{s.carrier}</div>
            {s.provider === 'uber' && s.providerStatus ? (
              <Badge tone={uberStatus(s.providerStatus)!.tone} className="mt-0.5">
                {uberStatus(s.providerStatus)!.label}
              </Badge>
            ) : (
              s.carrierTrackingCode && <div className="font-mono text-xs text-muted-foreground">{s.carrierTrackingCode}</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'status', header: 'Estado', cell: (s) => <ShipmentStatusBadge status={s.status} /> },
    {
      key: 'eta',
      header: 'Estimado',
      hideOnMobile: true,
      cell: (s) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {s.status === 'DELIVERED' && s.deliveredAt ? `Entregado ${formatDate(s.deliveredAt)}` : formatDate(s.estimatedDeliveryAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (s) => (
        <RowActions
          actions={[
            { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => open(s) },
            {
              label: 'Actualizar estado',
              icon: <RefreshCw className="w-4 h-4" />,
              onClick: () => setMoving(s),
              hidden: next(s).length === 0,
            },
            { label: 'Editar datos', icon: <Pencil className="w-4 h-4" />, onClick: () => setEditing(s) },
            {
              label: 'Ver orden',
              icon: <Hash className="w-4 h-4" />,
              onClick: () => navigate(`/dashboard/orders/${s.orderId}`),
              separator: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Envíos"
        description="Seguimiento de entregas a domicilio y retiros en el local. Los envíos se crean desde el detalle de cada orden."
        actions={
          <Link
            to="/dashboard/shipping-zones"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
          >
            <MapPinned className="w-4 h-4" /> Tarifas de envío
          </Link>
        }
      />

      <div className="overflow-x-auto">
        <Segmented
          value={f.values.status}
          onChange={(status) => f.set({ status })}
          options={[
            { value: '' as ShipmentStatus | '', label: 'Todos' },
            ...SHIPMENT_STATUSES.map((s) => ({ value: s as ShipmentStatus | '', label: SHIPMENT_STATUS[s].label })),
          ]}
        />
      </div>

      <DataTable
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <SearchInput
              value={f.values.trackingCode}
              onChange={(trackingCode) => f.set({ trackingCode })}
              placeholder="Código de seguimiento…"
            />
            <SearchInput
              value={f.values.orderId}
              onChange={(orderId) => f.set({ orderId })}
              placeholder="N° de orden"
              className="sm:w-36"
            />
            <SearchInput value={f.values.carrier} onChange={(carrier) => f.set({ carrier })} placeholder="Transportista…" className="sm:w-44" />
            <FilterSelect
              value={f.values.method}
              onChange={(method) => f.set({ method })}
              placeholder="Todas las modalidades"
              label="Modalidad"
              options={SHIPMENT_METHODS.map((m) => ({ value: m, label: SHIPMENT_METHOD[m] }))}
            />
          </FilterBar>
        }
        columns={columns}
        rows={data?.content}
        rowKey={(s) => s.id}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        onRowClick={open}
        empty={{
          icon: <Truck className="w-6 h-6" />,
          title: f.activeCount ? 'No hay envíos con esos filtros' : 'Todavía no hay envíos',
          description: f.activeCount
            ? 'Probá cambiando o limpiando los filtros.'
            : 'Creá un envío desde el detalle de una orden (“Crear envío”).',
        }}
        pagination={{
          info: data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      <ShipmentFormModal isOpen={!!editing} onClose={() => setEditing(null)} shipment={editing} />
      <ShipmentStatusModal isOpen={!!moving} onClose={() => setMoving(null)} shipment={moving} />
    </>
  );
}
