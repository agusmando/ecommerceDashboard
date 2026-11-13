import { useState } from 'react';
import { DollarSign, Percent, Receipt, ShoppingCart } from 'lucide-react';
import { ORDER_STATUSES } from '../api/types';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { Segmented } from '../components/Filters';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { DistributionBar, RankingBars, STATUS_BAR_CLASS, TrendChart } from '../components/Charts';
import { useOrderStats } from '../hooks/useOrderStats';
import { ORDER_STATUS, paymentLabel, todayInput } from '../lib/domain';
import { formatCurrency, formatNumber } from '../lib/utils';

const PERIODS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

export default function Statistics() {
  const [period, setPeriod] = useState<Period>('30');
  const since = todayInput(-(Number(period) - 1));
  const s = useOrderStats(since);

  const loading = s.isLoading;
  const chartBox = (node: React.ReactNode) =>
    loading ? <Skeleton className="h-[260px] w-full" /> : s.error ? <ErrorState error={s.error} onRetry={s.refetch} /> : node;

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
        <StatTile label="Facturación" value={formatCurrency(s.revenue)} icon={<DollarSign className="w-5 h-5" />} loading={loading} hint="Sin órdenes canceladas" />
        <StatTile label="Órdenes" value={formatNumber(s.totalAmount)} icon={<ShoppingCart className="w-5 h-5" />} loading={loading} hint={`${formatNumber(s.validCount)} no canceladas`} />
        <StatTile label="Ticket promedio" value={formatCurrency(s.avgTicket)} icon={<Receipt className="w-5 h-5" />} loading={loading} />
        <StatTile label="Descuentos otorgados" value={formatCurrency(s.discounts)} icon={<Percent className="w-5 h-5" />} loading={loading} hint="Suma de ofertas aplicadas" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturación diaria</CardTitle>
        </CardHeader>
        {chartBox(
          <TrendChart data={s.byDay} x="label" y="revenue" height={280} labelFormat={(_l, row) => `${row.label} · ${row.orders} órdenes`} />,
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
            <p className="text-sm text-muted-foreground">Por facturación de líneas no devueltas</p>
          </CardHeader>
          {chartBox(
            s.topProducts.length ? (
              <RankingBars data={s.topProducts} label="name" value="revenue" />
            ) : (
              <EmptyState title="Sin ventas en el período" className="py-8" />
            ),
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes por estado</CardTitle>
            </CardHeader>
            {loading ? (
              <Skeleton className="h-16" />
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
              <Skeleton className="h-32" />
            ) : !s.byPayment.length ? (
              <EmptyState title="Sin datos" className="py-6" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 font-medium">Medio</th>
                    <th className="pb-2 text-right font-medium">Órdenes</th>
                    <th className="pb-2 text-right font-medium">Total</th>
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
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
