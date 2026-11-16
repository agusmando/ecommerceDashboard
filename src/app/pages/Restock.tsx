import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Boxes, PackageSearch } from 'lucide-react';
import { orderItemsApi } from '../api/resources';
import { ORDER_ITEM_STATUSES, type Id, type OrderItem, type OrderItemStatus } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable, type Column } from '../components/DataTable';
import { FilterBar, FilterSelect, SearchInput } from '../components/Filters';
import { OrderItemStatusBadge } from '../components/Badge';
import { useListFilters } from '../hooks/useListFilters';
import { useAppDispatch } from '../store';
import { patchFilters } from '../store/filtersSlice';
import { ORDER_ITEM_STATUS, itemStockUnits } from '../lib/domain';
import { formatDate, formatNumber, formatOrderNumber } from '../lib/utils';

const DEFAULTS = {
  status: 'AWAITING_STOCK' as OrderItemStatus | '',
  productNameSnapshot: '',
  orderId: '',
};

/** Cantidad sin medida (el listado de ítems no incluye la variante): "2 × 500" o "300". */
const rawQty = (i: OrderItem) =>
  i.selectedBulkOption ? `${formatNumber(i.quantity)} × ${formatNumber(i.selectedBulkOption)}` : formatNumber(i.quantity);

interface Group {
  variantId: Id | null;
  product: string;
  variant: string;
  units: number;
  lines: number;
  orders: Set<Id>;
  nextDate: string | null;
}

export default function Restock() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const f = useListFilters('restock', DEFAULTS, { textKeys: ['productNameSnapshot', 'orderId'] });
  const orderId = Number(f.debounced.orderId);

  const { data, isLoading, isFetching, error, refetch } = orderItemsApi.usePage({
    status: f.debounced.status,
    productNameSnapshot: f.debounced.productNameSnapshot.trim(),
    orderId: orderId > 0 ? orderId : '',
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const it of data?.content ?? []) {
      const key = String(it.productVariantId ?? `${it.productNameSnapshot}|${it.variantNameSnapshot}`);
      const g =
        map.get(key) ??
        ({
          variantId: it.productVariantId,
          product: it.productNameSnapshot,
          variant: it.variantNameSnapshot,
          units: 0,
          lines: 0,
          orders: new Set<Id>(),
          nextDate: null,
        } as Group);
      g.units += itemStockUnits(it);
      g.lines += 1;
      g.orders.add(it.orderId);
      if (it.awaitingStockAt && (!g.nextDate || it.awaitingStockAt < g.nextDate)) g.nextDate = it.awaitingStockAt;
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [data]);

  const openInventory = (g: Group) => {
    dispatch(patchFilters({ key: 'inventory', patch: { name: g.variant, page: 1 } }));
    navigate('/dashboard/inventory');
  };

  const columns: Column<OrderItem>[] = [
    {
      key: 'product',
      header: 'Producto',
      cell: (i) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{i.productNameSnapshot}</div>
          <div className="text-xs text-muted-foreground truncate">{i.variantNameSnapshot}</div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Cantidad',
      cell: (i) => <span className="tabular-nums whitespace-nowrap">{rawQty(i)}</span>,
    },
    {
      key: 'date',
      header: 'Reposición est.',
      cell: (i) => <span className="text-muted-foreground">{formatDate(i.awaitingStockAt)}</span>,
    },
    {
      key: 'order',
      header: 'Orden',
      cell: (i) => (
        <Link
          to={`/dashboard/orders/${i.orderId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-primary hover:underline tabular-nums"
        >
          {formatOrderNumber(i.orderId)}
        </Link>
      ),
    },
    { key: 'status', header: 'Estado', cell: (i) => <OrderItemStatusBadge status={i.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Reposición"
        description="Ítems de órdenes que esperan stock. Agrupados para saber qué pedir a proveedores."
      />

      {f.values.status === 'AWAITING_STOCK' && groups.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Qué reponer</CardTitle>
          <p className="mb-4 text-xs text-muted-foreground">
            Resumen de la página actual. Cantidades en gramos (productos por kg) o unidades.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <div key={`${g.variantId}-${g.variant}`} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{g.product}</div>
                    <div className="text-xs text-muted-foreground truncate">{g.variant}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">{formatNumber(g.units)}</div>
                    <div className="text-[11px] text-muted-foreground">g / u</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {g.lines} {g.lines === 1 ? 'línea' : 'líneas'} · {g.orders.size} {g.orders.size === 1 ? 'orden' : 'órdenes'}
                    {g.nextDate && ` · ${formatDate(g.nextDate)}`}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openInventory(g)}>
                    <Boxes className="w-3.5 h-3.5" />
                    Inventario
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <DataTable
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <FilterSelect
              value={f.values.status}
              onChange={(status) => f.set({ status })}
              placeholder="Todos los estados"
              options={ORDER_ITEM_STATUSES.map((s) => ({ value: s, label: ORDER_ITEM_STATUS[s].label }))}
            />
            <SearchInput
              value={f.values.productNameSnapshot}
              onChange={(productNameSnapshot) => f.set({ productNameSnapshot })}
              placeholder="Buscar producto…"
            />
            <SearchInput
              value={f.values.orderId}
              onChange={(v) => f.set({ orderId: v.replace(/\D/g, '') })}
              placeholder="N° de orden"
              className="sm:w-36"
            />
          </FilterBar>
        }
        columns={columns}
        rows={data?.content}
        rowKey={(i) => i.id}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        onRowClick={(i) => navigate(`/dashboard/orders/${i.orderId}`)}
        empty={{
          icon: <PackageSearch className="w-6 h-6" />,
          title: f.values.status === 'AWAITING_STOCK' && !f.activeCount ? 'Nada pendiente de reposición' : 'Sin resultados',
          description:
            f.values.status === 'AWAITING_STOCK' && !f.activeCount
              ? 'Ningún ítem de orden está esperando stock.'
              : 'Probá cambiando los filtros.',
        }}
        pagination={{
          info: data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />
    </>
  );
}
