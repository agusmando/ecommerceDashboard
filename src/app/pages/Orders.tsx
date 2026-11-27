import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Download, Hash, Plus, ShoppingBag, ShoppingCart, Store, Truck, X } from 'lucide-react';
import { ordersApi } from '../api/resources';
import { ORDER_STATUSES, PAYMENT_TYPES, SHIPMENT_METHODS, type Order, type OrderStatus, type ShippingMethod } from '../api/types';
import { getErrorMessage } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { DataTable, type Column } from '../components/DataTable';
import { DateFilter, FilterBar, FilterSelect, SearchInput, Segmented } from '../components/Filters';
import { Badge, OrderStatusBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { nextStatuses, useOrderStatusChange } from '../components/orders/useOrderStatusChange';
import { useListFilters } from '../hooks/useListFilters';
import { useConfirm } from '../components/ConfirmProvider';
import { ORDER_STATUS, PAYMENT_STATUS, SHIPPING_METHOD_SHORT, orderChargedTotal, orderShippingCost, paymentLabel } from '../lib/domain';
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber, formatRelative } from '../lib/utils';
import { downloadCsv, csvFilename, toCsv } from '../lib/csv';

const DEFAULTS = {
  status: '' as OrderStatus | '',
  channel: '' as 'WEB' | 'COUNTER' | '',
  paymentType: '',
  shippingMethod: '' as ShippingMethod | '',
  createdAt: '',
  userSuperTokensId: '',
  q: '',
  paymentStatus: '',
};

/** CSV de las órdenes visibles (la página actual del listado filtrado). */
function ordersCsv(rows: Order[]) {
  return toCsv(
    ['Orden', 'Fecha', 'Cliente', 'Email', 'Ítems', 'Pago', 'Entrega', 'Estado', 'Total'],
    rows.map((o) => [
      formatOrderNumber(o.id),
      o.createdAt,
      o.user?.name ?? '',
      o.user?.email ?? o.userSuperTokensId,
      o.orderItems?.length ?? o.totalItems,
      paymentLabel(o.paymentType),
      o.shippingMethod === 'DELIVERY' ? 'Envío' : o.shippingMethod === 'PICKUP' ? 'Retiro' : '',
      ORDER_STATUS[o.status]?.label ?? o.status,
      orderChargedTotal(o).toFixed(2),
    ]),
  );
}

/** Ir directo a una orden por número (la API no filtra por id). */
function GoToOrder() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const id = Number(value.replace(/\D/g, ''));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (id > 0) navigate(`/dashboard/orders/${id}`);
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <div className="relative">
        <Hash className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="N° de orden"
          aria-label="Número de orden"
          className="h-9 w-36 rounded-lg border border-border bg-input-background pl-8 pr-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {id > 0 && (
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Ir a {formatOrderNumber(id)}
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </form>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const f = useListFilters('orders', DEFAULTS, { textKeys: ['userSuperTokensId', 'q'] });
  const { change, label } = useOrderStatusChange();
  const [updateOrder] = ordersApi.useUpdate();
  const confirm = useConfirm();

  // Selección para acciones masivas (solo las filas visibles).
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | ''>('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = ordersApi.usePage({
    detalle: true,
    status: f.debounced.status,
    channel: f.debounced.channel,
    paymentType: f.debounced.paymentType,
    paymentStatus: f.debounced.paymentStatus,
    shippingMethod: f.debounced.shippingMethod,
    createdAt: f.debounced.createdAt,
    userSuperTokensId: f.debounced.userSuperTokensId.trim(),
    q: f.debounced.q.trim(),
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });

  // Al cambiar de página o de resultados, la selección anterior ya no aplica.
  useEffect(() => setSelected(new Set()), [data?.content]);

  const rows = data?.content ?? [];
  const toggleRow = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows.map((o) => o.id)) : new Set());

  const runBulk = async () => {
    if (!bulkStatus || !selected.size) return;
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selected) {
      try {
        await updateOrder(id, { status: bulkStatus });
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkBusy(false);
    setSelected(new Set());
    setBulkStatus('');
    if (fail === 0) toast.success(`${ok} orden${ok === 1 ? '' : 'es'} actualizada${ok === 1 ? '' : 's'}`);
    else toast.warning(`${ok} actualizadas, ${fail} no se pudieron cambiar (transición no válida o error)`);
    refetch();
  };

  const applyBulk = () => {
    if (!bulkStatus || !selected.size) return;
    // Cancelar repone stock: pide confirmación explícita.
    if (bulkStatus === 'CANCELLED') {
      confirm({
        title: `Cancelar ${selected.size} orden${selected.size === 1 ? '' : 'es'}`,
        message: <>Las órdenes pasarán a <strong>Canceladas</strong> y se repondrá el stock de sus ítems. Las que no se puedan cancelar quedarán como están.</>,
        confirmText: 'Cancelar órdenes',
        variant: 'danger',
        onConfirm: runBulk,
      });
      return;
    }
    void runBulk();
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Orden',
      cell: (o) => <span className="font-medium tabular-nums">{formatOrderNumber(o.id)}</span>,
    },
    {
      key: 'date',
      header: 'Fecha',
      cell: (o) => (
        <div>
          <div className="whitespace-nowrap">{formatDateTime(o.createdAt)}</div>
          <div className="text-xs text-muted-foreground">{formatRelative(o.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      hideOnMobile: true,
      cell: (o) => (
        <div className="max-w-[200px] truncate" title={o.user?.email ?? o.userSuperTokensId}>
          {o.user?.email ?? <span className="font-mono text-xs text-muted-foreground">{o.userSuperTokensId.slice(0, 12)}…</span>}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      hideOnMobile: true,
      cell: (o) => <span className="tabular-nums">{o.orderItems?.length ?? o.totalItems}</span>,
    },
    {
      key: 'payment',
      header: 'Pago',
      hideOnMobile: true,
      cell: (o) => (
        <div className="flex flex-col items-start gap-1">
          <span>{paymentLabel(o.paymentType)}</span>
          {o.paymentType === 'MERCADOPAGO' && o.paymentStatus && (
            <Badge tone={PAYMENT_STATUS[o.paymentStatus].tone}>{PAYMENT_STATUS[o.paymentStatus].label}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'delivery',
      header: 'Entrega',
      hideOnMobile: true,
      cell: (o) =>
        o.channel === 'COUNTER' ? (
          <div className="flex items-start gap-1.5">
            <ShoppingBag className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            <div className="whitespace-nowrap">Mostrador</div>
          </div>
        ) : o.shippingMethod ? (
          <div className="flex items-start gap-1.5">
            {o.shippingMethod === 'DELIVERY' ? (
              <Truck className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Store className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="whitespace-nowrap">{o.shippingMethod === 'DELIVERY' ? 'Envío' : 'Retiro'}</div>
              {o.shippingMethod === 'DELIVERY' && o.shippingZone && (
                <div className="max-w-[140px] truncate text-xs text-muted-foreground">{o.shippingZone}</div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'total',
      header: 'Total cobrado',
      align: 'right',
      cell: (o) => (
        <div>
          <div className="font-medium tabular-nums">{formatCurrency(orderChargedTotal(o))}</div>
          {orderShippingCost(o) > 0 && (
            <div className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
              incl. envío {formatCurrency(orderShippingCost(o))}
            </div>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Estado', cell: (o) => <OrderStatusBadge status={o.status} method={o.shippingMethod} /> },
    {
      key: 'eta',
      header: 'Entrega est.',
      hideOnMobile: true,
      cell: (o) => <span className="text-muted-foreground">{formatDate(o.estimatedReadyAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (o) => (
        <RowActions
          actions={[
            { label: 'Ver detalle', onClick: () => navigate(`/dashboard/orders/${o.id}`) },
            ...nextStatuses(o.status).map((to, i) => ({
              label: label(to, o.shippingMethod),
              onClick: () => change(o, to),
              danger: to === 'CANCELLED',
              separator: i === 0,
            })),
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Órdenes"
        description="Seguimiento de ventas: confirmá, despachá y entregá pedidos. Las ventas del local se cargan con Venta de mostrador."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => rows.length && downloadCsv(csvFilename('ordenes'), ordersCsv(rows))}
              disabled={!rows.length}
              title="Descarga las órdenes de la página actual (con los filtros aplicados)"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              Venta de mostrador
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <Segmented
          value={f.values.status}
          onChange={(status) => f.set({ status })}
          options={[
            { value: '' as OrderStatus | '', label: 'Todas' },
            ...ORDER_STATUSES.map((s) => ({ value: s as OrderStatus | '', label: ORDER_STATUS[s].label })),
          ]}
        />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">{selected.size} orden{selected.size === 1 ? '' : 'es'} seleccionada{selected.size === 1 ? '' : 's'}</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as OrderStatus | '')}
            aria-label="Cambiar estado de las seleccionadas"
            className="h-9 rounded-lg border border-border bg-input-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Cambiar estado a…</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS[s].label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={applyBulk} disabled={!bulkStatus || bulkBusy}>
            {bulkBusy ? 'Aplicando…' : 'Aplicar'}
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" /> Limpiar selección
          </button>
        </div>
      )}

      <DataTable
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset} right={<GoToOrder />}>
            <FilterSelect
              value={f.values.channel}
              onChange={(channel) => f.set({ channel })}
              placeholder="Todos los canales"
              label="Canal"
              options={[
                { value: 'WEB', label: 'Tienda online' },
                { value: 'COUNTER', label: 'Mostrador' },
              ]}
            />
            <FilterSelect
              value={f.values.paymentType}
              onChange={(paymentType) => f.set({ paymentType })}
              placeholder="Todos los pagos"
              options={PAYMENT_TYPES.map((p) => ({ value: p, label: paymentLabel(p) }))}
            />
            <FilterSelect
              value={f.values.paymentStatus}
              onChange={(paymentStatus) => f.set({ paymentStatus })}
              placeholder="Estado de pago"
              label="Pago"
              options={Object.entries(PAYMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))}
            />
            <FilterSelect
              value={f.values.shippingMethod}
              onChange={(shippingMethod) => f.set({ shippingMethod })}
              placeholder="Retiro y envío"
              label="Entrega"
              options={SHIPMENT_METHODS.map((m) => ({ value: m, label: SHIPPING_METHOD_SHORT[m] }))}
            />
            <DateFilter label="Desde" value={f.values.createdAt} onChange={(createdAt) => f.set({ createdAt })} />
            <SearchInput
              value={f.values.q}
              onChange={(q) => f.set({ q })}
              placeholder="Email, nombre, seguimiento o producto"
            />
            <SearchInput
              value={f.values.userSuperTokensId}
              onChange={(userSuperTokensId) => f.set({ userSuperTokensId })}
              placeholder="ID de cliente (SuperTokens)"
            />
          </FilterBar>
        }
        columns={columns}
        rows={data?.content}
        rowKey={(o) => o.id}
        selection={{
          selected,
          onToggle: (key, checked) => toggleRow(Number(key), checked),
          onToggleAll: toggleAll,
        }}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        onRowClick={(o) => navigate(`/dashboard/orders/${o.id}`)}
        empty={{
          icon: <ShoppingCart className="w-6 h-6" />,
          title: f.activeCount ? 'No hay órdenes con esos filtros' : 'Todavía no hay órdenes',
          description: f.activeCount ? 'Probá cambiando o limpiando los filtros.' : 'Las compras de la tienda aparecerán acá.',
        }}
        pagination={{
          info: data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      <CreateOrderModal isOpen={creating} onClose={() => setCreating(false)} />
    </>
  );
}
