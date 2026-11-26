import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertTriangle, ArrowRight, ChevronRight, Clock, DollarSign, PackageSearch, Receipt, ShoppingCart, Tag, Ticket, Truck } from 'lucide-react';
import { cartsApi, discountCodesApi, offersApi, orderItemsApi, ordersApi, variantsApi } from '../api/resources';
import type { OrderStatus, ProductVariant } from '../api/types';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { Badge, OrderStatusBadge } from '../components/Badge';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { TrendChart } from '../components/Charts';
import { variantLabel } from '../components/CatalogPickers';
import { useOrderStats } from '../hooks/useOrderStats';
import { useAppDispatch, useAppSelector } from '../store';
import { patchFilters } from '../store/filtersSlice';
import { couponState, formatQty, offerState, orderChargedTotal, stockLevel, todayInput } from '../lib/domain';
import { formatCurrency, formatNumber, formatOrderNumber, formatRelative } from '../lib/utils';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const since = todayInput(-13);
  const stats = useOrderStats(since);
  const today = todayInput();
  const todayRevenue = stats.byDay.find((d) => d.day === today)?.revenue ?? 0;

  const pending = ordersApi.usePage({ status: 'PENDING', amountPerPage: 5, detalle: true });
  const processing = ordersApi.usePage({ status: 'PROCESSING', amountPerPage: 1 });
  const processingDelivery = ordersApi.usePage({ status: 'PROCESSING', shippingMethod: 'DELIVERY', amountPerPage: 1 });
  const awaiting = orderItemsApi.usePage({ status: 'AWAITING_STOCK', amountPerPage: 5 });
  const offers = offersApi.useList({ active: true });
  const discountCodes = discountCodesApi.useList({ active: true });
  const variants = variantsApi.usePage({ active: true, lowStock: true, detalle: true, amountPerPage: 100 });
  const carts = cartsApi.usePage({ detalle: true, amountPerPage: 100 });

  const soon = Date.now() + 2 * 24 * 3600 * 1000;
  const expiringIn48h = <T extends { active: boolean; startTime: string; finishTime: string | null }>(
    list: T[] | undefined,
    state: (o: T) => string,
  ) =>
    (list ?? []).filter((o) => {
      const finish = o.finishTime ? new Date(o.finishTime).getTime() : 0;
      return finish > Date.now() && finish <= soon && state(o) === 'active';
    }).length;
  const offersExpiring = expiringIn48h(offers.data, offerState);
  const codesExpiring = expiringIn48h(discountCodes.data, couponState);

  const awaitingTotal = awaiting.data?.pagination.totalAmount ?? 0;
  const missingNames = Array.from(new Set((awaiting.data?.content ?? []).map((i) => i.productNameSnapshot))).slice(0, 2);
  const cartsWithItems = (carts.data?.content ?? []).filter((c) => (c.summary?.itemsCount ?? c.items?.length ?? 0) > 0).length;
  const lowStockTotal = variants.data?.pagination.totalAmount ?? 0;

  const lowStock = useMemo(
    () =>
      (variants.data?.content ?? [])
        .filter((v) => stockLevel(v).tone !== 'success')
        .sort((a, b) => a.currentStock / Math.max(1, a.stockThreshold) - b.currentStock / Math.max(1, b.stockThreshold))
        .slice(0, 8),
    [variants.data],
  );

  const todayLoading =
    processingDelivery.isLoading || awaiting.isLoading || carts.isLoading || offers.isLoading || discountCodes.isLoading;

  const goOrders = (status: OrderStatus) => {
    dispatch(patchFilters({ key: 'orders', patch: { status, page: 1 } }));
    navigate('/dashboard/orders');
  };

  const goInventory = (v?: ProductVariant) => {
    dispatch(patchFilters({ key: 'inventory', patch: { ...(v ? { name: v.name } : {}), lowOnly: true, page: 1 } }));
    navigate('/dashboard/inventory');
  };

  const todayItems = [
    {
      icon: Truck,
      label: 'Envíos por preparar',
      value: processingDelivery.data?.pagination.totalAmount ?? 0,
      hint: `${processing.data?.pagination.totalAmount ?? 0} en preparación en total`,
      onClick: () => goOrders('PROCESSING'),
    },
    {
      icon: PackageSearch,
      label: 'Esperando stock',
      value: awaitingTotal,
      hint: missingNames.length ? `Falta: ${missingNames.join(', ')}` : 'nada pendiente',
      onClick: () => navigate('/dashboard/restock'),
    },
    {
      icon: ShoppingCart,
      label: 'Carritos con productos',
      value: cartsWithItems,
      hint: `${carts.data?.pagination.totalAmount ?? 0} carritos en total`,
      onClick: () => navigate('/dashboard/carts'),
    },
    ...(offersExpiring
      ? [
          {
            icon: Tag,
            label: 'Ofertas por vencer',
            value: offersExpiring,
            hint: 'en las próximas 48 h',
            onClick: () => navigate('/dashboard/offers'),
          },
        ]
      : []),
    ...(codesExpiring
      ? [
          {
            icon: Ticket,
            label: 'Códigos por vencer',
            value: codesExpiring,
            hint: 'en las próximas 48 h',
            onClick: () => navigate('/dashboard/discounts'),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Resumen de los últimos 14 días."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ventas de hoy (productos)"
          value={formatCurrency(todayRevenue)}
          hint={`${formatCurrency(stats.revenue)} en 14 días · envíos ${formatCurrency(stats.shipping.revenue)}`}
          icon={<DollarSign className="w-5 h-5" />}
          loading={stats.isLoading}
        />
        <StatTile
          label="Ticket promedio"
          value={formatCurrency(stats.avgTicket)}
          hint={`${formatNumber(stats.validCount)} órdenes no canceladas`}
          icon={<Receipt className="w-5 h-5" />}
          loading={stats.isLoading}
        />
        <StatTile
          label="Pendientes de confirmar"
          value={formatNumber(pending.data?.pagination.totalAmount ?? 0)}
          hint={`${processing.data?.pagination.totalAmount ?? 0} en preparación`}
          icon={<ShoppingCart className="w-5 h-5" />}
          loading={pending.isLoading}
        />
        <StatTile
          label="Ítems esperando stock"
          value={formatNumber(awaitingTotal)}
          hint={`${formatNumber(lowStockTotal)} variantes bajo umbral`}
          icon={<PackageSearch className="w-5 h-5" />}
          loading={awaiting.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Ventas por día</CardTitle>
              <p className="text-sm text-muted-foreground">Productos de órdenes no canceladas (sin envío)</p>
            </div>
            <Link to="/dashboard/statistics" className="text-sm font-medium text-primary hover:underline">
              Ver estadísticas
            </Link>
          </CardHeader>
          {stats.isLoading ? (
            <Skeleton className="min-h-[260px] w-full flex-1" />
          ) : stats.error ? (
            <ErrorState error={stats.error} onRetry={stats.refetch} />
          ) : (
            <div className="relative min-h-[260px] flex-1">
              <div className="absolute inset-0">
                <TrendChart
                  data={stats.byDay}
                  x="label"
                  y="revenue"
                  height="100%"
                  labelFormat={(_l, row) => `${row.label} · ${row.orders} órdenes`}
                />
              </div>
            </div>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Hoy</CardTitle>
            <p className="text-sm text-muted-foreground">Lo que necesita atención</p>
          </CardHeader>
          {todayLoading ? (
            <div className="space-y-3">
              {Array.from({ length: todayItems.length }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {todayItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                    >
                      <Icon className={item.value > 0 ? 'w-4 h-4 shrink-0 text-amber-500' : 'w-4 h-4 shrink-0 text-muted-foreground'} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.hint}</div>
                      </div>
                      <span className={item.value > 0 ? 'text-sm font-semibold tabular-nums' : 'text-sm tabular-nums text-muted-foreground'}>
                        {formatNumber(item.value)}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Stock bajo</CardTitle>
              {lowStockTotal > 8 && <p className="text-sm text-muted-foreground">Mostrando las 8 más urgentes de {formatNumber(lowStockTotal)}</p>}
            </div>
            <button type="button" onClick={() => goInventory()} className="text-sm font-medium text-primary hover:underline">
              Ver en inventario
            </button>
          </CardHeader>
          {variants.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <EmptyState title="Todo en orden" description="Ninguna variante activa está por debajo de su umbral." className="py-8" />
          ) : (
            <ul className="space-y-1">
              {lowStock.map((v) => {
                const lvl = stockLevel(v);
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => goInventory(v)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                    >
                      <AlertTriangle className={lvl.tone === 'danger' ? 'w-4 h-4 shrink-0 text-red-500' : 'w-4 h-4 shrink-0 text-amber-500'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{variantLabel(v)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatQty(v.currentStock, v.contentMeasure)} · umbral {formatQty(v.stockThreshold, v.contentMeasure)}
                        </div>
                      </div>
                      <Badge tone={lvl.tone}>{lvl.label}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        </div>
      </div>

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex min-w-0 items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-amber-500" />
            <CardTitle>Órdenes pendientes de confirmar</CardTitle>
          </div>
          <ViewAllButton onClick={() => {
            dispatch(patchFilters({ key: 'orders', patch: { status: 'PENDING', page: 1 } }));
            navigate('/dashboard/orders');
          }} />
        </div>
        {pending.isLoading ? (
          <div className="p-4 sm:p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !pending.data?.content.length ? (
          <EmptyState title="No hay órdenes pendientes" icon={<Tag className="w-6 h-6" />} className="py-8" />
        ) : (
          <ul className="divide-y divide-border">
            {pending.data.content.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/dashboard/orders/${o.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 py-3 text-sm hover:bg-muted/40"
                >
                  <span className="font-mono font-medium">{formatOrderNumber(o.id)}</span>
                  <span className="text-muted-foreground">{formatRelative(o.createdAt)}</span>
                  <span className="min-w-0 max-w-full truncate text-muted-foreground">{o.user?.email ?? o.userSuperTokensId.slice(0, 8)}</span>
                  <span className="ml-auto font-medium tabular-nums">{formatCurrency(orderChargedTotal(o))}</span>
                  <OrderStatusBadge status={o.status} method={o.shippingMethod} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ViewAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      Ver todas <ArrowRight className="w-4 h-4" />
    </button>
  );
}
