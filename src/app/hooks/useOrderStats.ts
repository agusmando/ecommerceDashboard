import { useMemo } from 'react';
import { ordersApi } from '../api/resources';
import type { Order, OrderStatus } from '../api/types';
import { itemTotal, CLOSED_ITEM_STATUSES } from '../lib/domain';

/**
 * Trae las órdenes desde una fecha (hasta 3 páginas de 100, el máximo por
 * página del backend) y calcula los agregados que usan Inicio y Estadísticas.
 * Las páginas se comparten por cache: si otra vista pidió lo mismo no se repite.
 */
const PAGE = 100;

export function useOrderStats(sinceDay: string) {
  const base = { detalle: true, createdAt: sinceDay, amountPerPage: PAGE };
  const p1 = ordersApi.usePage({ ...base, currentPage: 1 });
  const totalPages = p1.data?.pagination.totalPages ?? 1;
  const p2 = ordersApi.usePage({ ...base, currentPage: 2 }, { skip: totalPages < 2 });
  const p3 = ordersApi.usePage({ ...base, currentPage: 3 }, { skip: totalPages < 3 });

  const orders = useMemo<Order[]>(
    () => [...(p1.data?.content ?? []), ...(totalPages >= 2 ? p2.data?.content ?? [] : []), ...(totalPages >= 3 ? p3.data?.content ?? [] : [])],
    [p1.data, p2.data, p3.data, totalPages],
  );

  const stats = useMemo(() => computeStats(orders, sinceDay), [orders, sinceDay]);

  return {
    ...stats,
    orders,
    totalAmount: p1.data?.pagination.totalAmount ?? 0,
    truncated: totalPages > 3,
    isLoading: p1.isLoading,
    isFetching: p1.isFetching || p2.isFetching || p3.isFetching,
    error: p1.error,
    refetch: p1.refetch,
  };
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function computeStats(orders: Order[], sinceDay: string) {
  const valid = orders.filter((o) => o.status !== 'CANCELLED');
  const revenue = valid.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);

  // Ventas por día, con días vacíos en 0 para no mentir en el eje temporal.
  const byDayMap = new Map<string, { revenue: number; orders: number }>();
  const start = new Date(`${sinceDay}T00:00:00`);
  for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
    byDayMap.set(dayKey(d), { revenue: 0, orders: 0 });
  }
  valid.forEach((o) => {
    const k = dayKey(new Date(o.createdAt));
    const cur = byDayMap.get(k) ?? { revenue: 0, orders: 0 };
    byDayMap.set(k, { revenue: cur.revenue + Number(o.totalPrice || 0), orders: cur.orders + 1 });
  });
  const byDay = [...byDayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, label: day.slice(8, 10) + '/' + day.slice(5, 7), ...v }));

  const byStatus = new Map<OrderStatus, number>();
  orders.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  const byPayment = new Map<string, { count: number; revenue: number }>();
  valid.forEach((o) => {
    const cur = byPayment.get(o.paymentType) ?? { count: 0, revenue: 0 };
    byPayment.set(o.paymentType, { count: cur.count + 1, revenue: cur.revenue + Number(o.totalPrice || 0) });
  });

  const products = new Map<string, { name: string; revenue: number; lines: number }>();
  let discounts = 0;
  valid.forEach((o) =>
    o.orderItems?.forEach((it) => {
      if (CLOSED_ITEM_STATUSES.includes(it.status)) return;
      discounts += Number(it.discountAppliedSnapshot) || 0;
      const name =
        it.variantNameSnapshot && it.variantNameSnapshot !== it.productNameSnapshot
          ? `${it.productNameSnapshot} · ${it.variantNameSnapshot}`
          : it.productNameSnapshot;
      const key = String(it.productVariantId ?? name);
      const cur = products.get(key) ?? { name, revenue: 0, lines: 0 };
      products.set(key, { name, revenue: cur.revenue + itemTotal(it), lines: cur.lines + 1 });
    }),
  );

  return {
    revenue,
    validCount: valid.length,
    avgTicket: valid.length ? revenue / valid.length : 0,
    discounts,
    byDay,
    byStatus,
    byPayment: [...byPayment.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.revenue - a.revenue),
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}
