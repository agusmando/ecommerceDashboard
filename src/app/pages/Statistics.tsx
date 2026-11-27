import { useState } from 'react';
import { DollarSign, MapPin, Percent, Receipt, ShoppingCart, Store, Truck, Wallet } from 'lucide-react';
import { ORDER_STATUSES } from '../api/types';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { Segmented } from '../components/Filters';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { DistributionBar, RankingBars, STATUS_BAR_CLASS, TrendChart } from '../components/Charts';
import { useOrderStats } from '../hooks/useOrderStats';
import { ORDER_STATUS, paymentLabel, shippingProviderLabel, todayInput } from '../lib/domain';
import { formatCurrency, formatNumber } from '../lib/utils';

const PERIODS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

export default function Statistics() {
  const [period, setPeriod] = useState<Period>('30');
  const [productChannel, setProductChannel] = useState<'all' | 'web' | 'counter'>('all');
  const since = todayInput(-(Number(period) - 1));
  const s = useOrderStats(since);

  const loading = s.isLoading;
  const productSortKey = productChannel === 'all' ? 'revenue' : productChannel;
  const productRows = s.topProducts
    .filter((p) => p[productSortKey] > 0)
    .sort((a, b) => b[productSortKey] - a[productSortKey])
    .slice(0, 8);
  const chartBox = (node: React.ReactNode, skeletonClass = 'h-[260px] w-full') =>
    loading ? <Skeleton className={skeletonClass} /> : s.error ? <ErrorState error={s.error} onRetry={s.refetch} /> : node;

  return (
    <>
      <PageHeader
        title="Estadísticas"
        description={
          <>
            Calculadas a partir de las órdenes creadas desde el {since.split('-').reverse().join('/')}.
            {s.truncated && ' Se analizan las 300 más recientes del período.'}
          </>
        }
        actions={<Segmented value={period} onChange={setPeriod} options={[...PERIODS]} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Ventas de productos" value={formatCurrency(s.revenue)} icon={<DollarSign className="w-5 h-5" />} loading={loading} hint={`${formatNumber(s.byChannel.web.count)} en tienda · ${formatNumber(s.byChannel.counter.count)} en mostrador`} />
        <StatTile label="Órdenes" value={formatNumber(s.totalAmount)} icon={<ShoppingCart className="w-5 h-5" />} loading={loading} hint={`${formatNumber(s.validCount)} no canceladas`} />
        <StatTile label="Ticket promedio" value={formatCurrency(s.avgTicket)} icon={<Receipt className="w-5 h-5" />} loading={loading} hint="Solo productos" />
        <StatTile label="Descuentos otorgados" value={formatCurrency(s.discounts)} icon={<Percent className="w-5 h-5" />} loading={loading} hint="Suma de ofertas aplicadas" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas de productos por día</CardTitle>
          <p className="text-sm text-muted-foreground">Sin costo de envío</p>
        </CardHeader>
        {chartBox(
          <TrendChart
            data={s.byDay}
            x="label"
            y="revenue"
            series={[
              { key: 'web', label: 'Tienda online', color: 'var(--chart-1)' },
              { key: 'counter', label: 'Mostrador', color: 'var(--chart-2)' },
            ]}
            height={280}
            labelFormat={(_l, row) => `${row.label} · ${row.orders} órdenes`}
          />,
          'h-[280px] w-full',
        )}
      </Card>

      <ShippingStats s={s} loading={loading} chartBox={chartBox} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
        <Card className="flex min-w-0 flex-col">
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Productos más vendidos</CardTitle>
              <p className="text-sm text-muted-foreground">Por facturación de líneas no devueltas</p>
            </div>
            <Segmented
              value={productChannel}
              onChange={setProductChannel}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'web', label: 'Tienda' },
                { value: 'counter', label: 'Mostrador' },
              ]}
            />
          </CardHeader>
          <div className="min-h-[280px] flex-1">
            {chartBox(
              productRows.length ? (
                <RankingBars data={productRows} label="name" value={productSortKey} height="100%" />
              ) : (
                <EmptyState title="Sin ventas en el período" className="py-8" />
              ),
              'h-full min-h-[280px]',
            )}
          </div>
        </Card>

        <ChannelStats s={s} loading={loading} />
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes por estado</CardTitle>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-24" />
            ) : (
              <DistributionBar
                segments={ORDER_STATUSES.map((st) => ({
                  key: st,
                  label: ORDER_STATUS[st].label,
                  value: s.byStatus.get(st) ?? 0,
                  className: STATUS_BAR_CLASS[st],
                }))}
              />
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medios de pago</CardTitle>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-44" />
            ) : !s.byPayment.length ? (
              <EmptyState title="Sin datos" className="py-6" />
            ) : (
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[22rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Medio</th>
                    <th className="pb-2 text-right font-medium">Órdenes</th>
                    <th className="pb-2 text-right font-medium">Productos</th>
                    <th className="pb-2 pl-4 font-medium w-1/3">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.byPayment.map((p) => {
                    const share = s.revenue ? (p.revenue / s.revenue) * 100 : 0;
                    return (
                      <tr key={p.type}>
                        <td className="py-2">{paymentLabel(p.type)}</td>
                        <td className="py-2 text-right tabular-nums">{p.count}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(p.revenue)}</td>
                        <td className="py-2 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-muted">
                              <div className="h-1.5 rounded-full bg-[var(--chart-1)]" style={{ width: `${share}%` }} />
                            </div>
                            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

type Stats = ReturnType<typeof useOrderStats>;

/** Tienda online vs. mostrador: pedidos, facturación y ticket promedio por canal. */
function ChannelStats({ s, loading }: { s: Stats; loading: boolean }) {
  const channels = [
    { key: 'web', label: 'Tienda online', ...s.byChannel.web },
    { key: 'counter', label: 'Mostrador', ...s.byChannel.counter },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por canal</CardTitle>
        <p className="text-sm text-muted-foreground">Órdenes no canceladas del período</p>
      </CardHeader>
      {loading ? (
        <Skeleton className="h-28" />
      ) : !s.validCount ? (
        <EmptyState title="Sin ventas en el período" className="py-6" />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 font-medium">Canal</th>
              <th className="pb-2 text-right font-medium">Órdenes</th>
              <th className="pb-2 text-right font-medium">Productos</th>
              <th className="pb-2 text-right font-medium">Ticket prom.</th>
              <th className="pb-2 pl-4 font-medium w-1/4">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {channels.map((c) => {
              const share = s.revenue ? (c.revenue / s.revenue) * 100 : 0;
              return (
                <tr key={c.key}>
                  <td className="py-2">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.count}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(c.revenue)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(c.count ? c.revenue / c.count : 0)}</td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted">
                        <div className="h-1.5 rounded-full bg-[var(--chart-1)]" style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{share.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </Card>
  );
}

/** Envíos: ingresos por envío (aparte de las ventas de productos), domicilio vs retiro y apertura por departamento. */
function ShippingStats({ s, loading, chartBox }: { s: Stats; loading: boolean; chartBox: (n: React.ReactNode) => React.ReactNode }) {
  const sh = s.shipping;
  const total = sh.deliveries + sh.pickups;
  const deliveryShare = total ? Math.round((sh.deliveries / total) * 100) : 0;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ingresos por envío"
          value={formatCurrency(sh.revenue)}
          icon={<Wallet className="w-5 h-5" />}
          loading={loading}
          hint={`Total cobrado con envío: ${formatCurrency(s.chargedRevenue)}`}
        />
        <StatTile
          label="Envíos a domicilio"
          value={formatNumber(sh.deliveries)}
          icon={<Truck className="w-5 h-5" />}
          loading={loading}
          hint={`${deliveryShare}% de las órdenes no canceladas`}
        />
        <StatTile
          label="Retiros en el local"
          value={formatNumber(sh.pickups)}
          icon={<Store className="w-5 h-5" />}
          loading={loading}
          hint={total ? `${100 - deliveryShare}% de las órdenes no canceladas` : undefined}
        />
        <StatTile
          label="Costo promedio de envío"
          value={formatCurrency(sh.avgCost)}
          icon={<MapPin className="w-5 h-5" />}
          loading={loading}
          hint={
            sh.deliveries
              ? sh.paidDeliveries < sh.deliveries
                ? `${sh.deliveries - sh.paidDeliveries} envíos gratis incluidos`
                : 'Por envío a domicilio'
              : 'Sin envíos en el período'
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envíos por departamento</CardTitle>
          <p className="text-sm text-muted-foreground">Ingresos por envío de órdenes no canceladas</p>
        </CardHeader>
        {chartBox(
          !sh.byZone.length ? (
            <EmptyState title="Sin envíos a domicilio en el período" className="py-8" />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="min-w-0">
                <RankingBars data={sh.byZone} label="zone" value="revenue" />
              </div>
              <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[20rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 font-medium">Departamento</th>
                      <th className="pb-2 text-right font-medium">Envíos</th>
                      <th className="pb-2 text-right font-medium">Cobrado</th>
                      <th className="pb-2 text-right font-medium">Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sh.byZone.map((z) => (
                      <tr key={z.zone}>
                        <td className="py-2">{z.zone}</td>
                        <td className="py-2 text-right tabular-nums">{z.count}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(z.revenue)}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(z.count ? z.revenue / z.count : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sh.byProvider.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {sh.byProvider
                      .map((p) => `${shippingProviderLabel(p.provider)}: ${p.count} (${formatCurrency(p.revenue)})`)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ),
        )}
      </Card>
    </>
  );
}
