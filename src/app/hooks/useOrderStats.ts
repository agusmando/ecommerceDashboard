import { useMemo } from 'react';
import { ordersApi } from '../api/resources';
import type { Order, OrderStatus } from '../api/types';
import { itemTotal, orderShippingCost, CLOSED_ITEM_STATUSES } from '../lib/domain';

/**
 * Trae las órdenes desde una fecha (hasta 10 páginas de 100, el máximo por
 * página del backend) y calcula los agregados que usan Inicio y Estadísticas.
 * Las páginas se comparten por cache: si otra vista pidió lo mismo no se repite.
 */
const PAGE = 100;

export function useOrderStats(sinceDay: string) {
  const base = { detalle: true, createdAt: sinceDay, amountPerPage: PAGE };
  const p1 = ordersApi.usePage({ ...base, currentPage: 1 });
  const totalPages = p1.data?.pagination.totalPages ?? 1;
  const pages = [
    p1,
    ordersApi.usePage({ ...base, currentPage: 2 }, { skip: totalPages < 2 }),
    ordersApi.usePage({ ...base, currentPage: 3 }, { skip: totalPages < 3 }),
    ordersApi.usePage({ ...base, currentPage: 4 }, { skip: totalPages < 4 }),
    ordersApi.usePage({ ...base, currentPage: 5 }, { skip: totalPages < 5 }),
    ordersApi.usePage({ ...base, currentPage: 6 }, { skip: totalPages < 6 }),
    ordersApi.usePage({ ...base, currentPage: 7 }, { skip: totalPages < 7 }),
    ordersApi.usePage({ ...base, currentPage: 8 }, { skip: totalPages < 8 }),
    ordersApi.usePage({ ...base, currentPage: 9 }, { skip: totalPages < 9 }),
    ordersApi.usePage({ ...base, currentPage: 10 }, { skip: totalPages < 10 }),
  ];
  const requestedPages = Math.min(totalPages, 10);
  const pageResults = pages.slice(0, requestedPages).map((page, index) => ({
    page: index + 1,
    data: page.data,
    error: page.error,
    loading: page.isLoading,
    fetching: page.isFetching,
    refetch: page.refetch,
  }));

  const orders = useMemo<Order[]>(
    () => pageResults.flatMap((page) => page.data?.content ?? []),
    [
      p1.data, pages[1].data, pages[2].data, pages[3].data, pages[4].data,
      pages[5].data, pages[6].data, pages[7].data, pages[8].data, pages[9].data,
      requestedPages,
    ],
  );

  const stats = useMemo(() => computeStats(orders, sinceDay), [orders, sinceDay]);
  const failedPages = pageResults.filter((page) => page.error).map((page) => page.page);

  return {
    ...stats,
    orders,
    totalAmount: p1.data?.pagination.totalAmount ?? 0,
    truncated: totalPages > 10,
    requestedPages,
    pagesFetched: pageResults.filter((page) => page.data).length,
    failedPages,
    complete: failedPages.length === 0 && totalPages <= 10 && pageResults.every((page) => page.data),
    isLoading: pageResults.some((page) => page.loading),
    isFetching: pageResults.some((page) => page.fetching),
    error: pageResults.find((page) => page.error)?.error,
    refetch: () => Promise.all(pageResults.map((page) => page.refetch())),
  };
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Etiqueta para envíos sin departamento informado. */
export const NO_ZONE = 'Sin departamento';

/**
 * `revenue` son ventas de PRODUCTOS (`totalPrice`); lo cobrado por envío va
 * aparte en `shipping` para no mezclar los dos ingresos.
 */
export function computeStats(orders: Order[], sinceDay: string) {
  const valid = orders.filter((o) => o.status !== 'CANCELLED');
  const revenue = valid.reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);

  // Envíos: ingresos, retiro vs domicilio y apertura por departamento.
  let shippingRevenue = 0;
  let deliveries = 0;
  let pickups = 0;
  let paidDeliveries = 0;
  const byZoneMap = new Map<string, { zone: string; revenue: number; count: number }>();
  const byProvider = new Map<string, { count: number; revenue: number }>();
  valid.forEach((o) => {
    const cost = orderShippingCost(o);
    shippingRevenue += cost;
    if ((o.shippingMethod ?? o.shipment?.method) !== 'DELIVERY') {
      pickups += 1;
      return;
    }
    deliveries += 1;
    if (cost > 0) paidDeliveries += 1;
    const zone = o.shippingZone || o.shipment?.zone || NO_ZONE;
    const z = byZoneMap.get(zone) ?? { zone, revenue: 0, count: 0 };
    byZoneMap.set(zone, { zone, revenue: z.revenue + cost, count: z.count + 1 });
    const provider = o.shippingProvider || 'own';
    const p = byProvider.get(provider) ?? { count: 0, revenue: 0 };
    byProvider.set(provider, { count: p.count + 1, revenue: p.revenue + cost });
  });
  const shipping = {
    revenue: shippingRevenue,
    deliveries,
    pickups,
    /** Promedio cobrado por envío a domicilio (los gratis cuentan como $0). */
    avgCost: deliveries ? shippingRevenue / deliveries : 0,
    paidDeliveries,
    byZone: [...byZoneMap.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count),
    byProvider: [...byProvider.entries()].map(([provider, v]) => ({ provider, ...v })).sort((a, b) => b.count - a.count),
  };

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
    /** Ventas de productos (sin envío). */
    revenue,
    /** Lo cobrado a clientes: productos + envío. */
    chargedRevenue: revenue + shippingRevenue,
    shipping,
    validCount: valid.length,
    avgTicket: valid.length ? revenue / valid.length : 0,
    discounts,
    byDay,
    byStatus,
    byPayment: [...byPayment.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.revenue - a.revenue),
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
  };
}
