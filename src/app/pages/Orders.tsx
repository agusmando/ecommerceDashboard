import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Hash, Plus, ShoppingCart } from 'lucide-react';
import { ordersApi } from '../api/resources';
import { ORDER_STATUSES, PAYMENT_TYPES, type Order, type OrderStatus } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { DataTable, type Column } from '../components/DataTable';
import { DateFilter, FilterBar, FilterSelect, SearchInput, Segmented } from '../components/Filters';
import { OrderStatusBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { CreateOrderModal } from '../components/orders/CreateOrderModal';
import { nextStatuses, useOrderStatusChange } from '../components/orders/useOrderStatusChange';
import { useListFilters } from '../hooks/useListFilters';
import { ORDER_STATUS, paymentLabel } from '../lib/domain';
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber, formatRelative } from '../lib/utils';

const DEFAULTS = {
  status: '' as OrderStatus | '',
  paymentType: '',
  createdAt: '',
  userSuperTokensId: '',
};

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
  const f = useListFilters('orders', DEFAULTS, { textKeys: ['userSuperTokensId'] });
  const { change, label } = useOrderStatusChange();

  const { data, isLoading, isFetching, error, refetch } = ordersApi.usePage({
    detalle: true,
    status: f.debounced.status,
    paymentType: f.debounced.paymentType,
    createdAt: f.debounced.createdAt,
    userSuperTokensId: f.debounced.userSuperTokensId.trim(),
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });

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
    { key: 'payment', header: 'Pago', hideOnMobile: true, cell: (o) => paymentLabel(o.paymentType) },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => <span className="font-medium tabular-nums">{formatCurrency(o.totalPrice)}</span>,
    },
    { key: 'status', header: 'Estado', cell: (o) => <OrderStatusBadge status={o.status} /> },
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
              label: label(to),
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
        description="Seguimiento de ventas: confirmá, despachá y entregá pedidos."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" />
            Nueva venta
          </Button>
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

      <DataTable
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset} right={<GoToOrder />}>
            <FilterSelect
              value={f.values.paymentType}
              onChange={(paymentType) => f.set({ paymentType })}
              placeholder="Todos los pagos"
              options={PAYMENT_TYPES.map((p) => ({ value: p, label: paymentLabel(p) }))}
            />
            <DateFilter label="Desde" value={f.values.createdAt} onChange={(createdAt) => f.set({ createdAt })} />
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
