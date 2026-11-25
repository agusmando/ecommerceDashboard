import type {
  PaymentStatus,
  Banner,
  BannerPlacement,
  BannerSize,
  DiscountType,
  Measure,
  MovementType,
  DiscountCode,
  Offer,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
  PaymentType,
  ProductVariant,
  ReviewStatus,
  Order,
  Shipment,
  ShipmentMethod,
  ShipmentStatus,
  UberDeliveryStatus,
} from '../api/types';
import { formatCurrency, formatNumber } from './utils';

export type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

// ---------------------------------------------------------------- Etiquetas

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  PROCESSING: { label: 'En preparación', tone: 'info' },
  SHIPPED: { label: 'Despachada', tone: 'violet' },
  DELIVERED: { label: 'Entregada', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'danger' },
};

/** Texto del botón para pasar a cada estado. */
export const ORDER_ACTION: Record<OrderStatus, string> = {
  PENDING: 'Volver a pendiente',
  PROCESSING: 'Confirmar',
  SHIPPED: 'Despachar',
  DELIVERED: 'Marcar entregada',
  CANCELLED: 'Cancelar orden',
};

/** Retiro en el local: "despachada" = lista para retirar; "entregada" = retirada. */
const PICKUP_ORDER_STATUS: Partial<typeof ORDER_STATUS> = {
  SHIPPED: { label: 'Lista para retirar', tone: 'violet' },
  DELIVERED: { label: 'Retirada', tone: 'success' },
};
const PICKUP_ORDER_ACTION: Partial<typeof ORDER_ACTION> = {
  SHIPPED: 'Lista para retirar',
  DELIVERED: 'Marcar retirada',
};

/** Etiqueta del estado de la orden según el método (sin método: genérica). */
export const orderStatusInfo = (status: OrderStatus, method?: string | null) =>
  (method === 'PICKUP' && PICKUP_ORDER_STATUS[status]) || ORDER_STATUS[status];

/** Texto del botón para pasar a `to` según el método. */
export const orderActionLabel = (to: OrderStatus, method?: string | null) =>
  (method === 'PICKUP' && PICKUP_ORDER_ACTION[to]) || ORDER_ACTION[to];

export const ORDER_ITEM_STATUS: Record<OrderItemStatus, { label: string; tone: Tone }> = {
  FULFILLED: { label: 'Asignado', tone: 'success' },
  AWAITING_STOCK: { label: 'Esperando stock', tone: 'warning' },
  PARTIALLY_RETURNED: { label: 'Parcial', tone: 'info' },
  OUT_OF_STOCK: { label: 'Sin stock', tone: 'danger' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
  RETURNED: { label: 'Devuelto', tone: 'default' },
};

export const PAYMENT_LABEL: Record<PaymentType, string> = {
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MERCADOPAGO: 'Mercado Pago',
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pago pendiente', tone: 'warning' },
  IN_PROCESS: { label: 'Pago en revisión', tone: 'info' },
  APPROVED: { label: 'Pagado', tone: 'success' },
  REJECTED: { label: 'Pago rechazado', tone: 'danger' },
  CANCELLED: { label: 'Pago cancelado', tone: 'default' },
  REFUNDED: { label: 'Devuelto', tone: 'default' },
  CHARGED_BACK: { label: 'Contracargo', tone: 'danger' },
};

export const paymentLabel = (p: string) => PAYMENT_LABEL[p as PaymentType] ?? p;

export const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: Tone; hint: string }> = {
  IN: { label: 'Ingreso', tone: 'success', hint: 'Entrada de mercadería: compras, stock inicial o ajustes positivos' },
  OUT: { label: 'Salida', tone: 'danger', hint: 'Venta, merma o pérdida (cantidad negativa)' },
  ADJUSTMENT: { label: 'Ajuste', tone: 'info', hint: 'Corrección por conteo de inventario (+/−)' },
  RETURN: { label: 'Devolución', tone: 'violet', hint: 'Devolución de un cliente o reposición por cancelación' },
  PRODUCTION: { label: 'Producción', tone: 'warning', hint: 'Generado al producir un mix (consume componentes)' },
};

export const DISCOUNT_TYPE: Record<DiscountType, { label: string; short: string }> = {
  PERCENTAGE: { label: 'Porcentaje de descuento', short: '% off' },
  FIXED: { label: 'Monto fijo por kg/unidad', short: '$ off' },
  BUY_MORE_GET_MORE: { label: 'Llevá N, pagá M (ej. 3x2)', short: 'NxM' },
  BUY_ONE_GET_MORE: { label: 'Llevá uno y llevate más', short: 'Promo' },
  BUY_MORE_GET_DISCOUNT: { label: '% de descuento desde N', short: '% x cantidad' },
  BUY_MORE_GET_FIXED_DISCOUNT: { label: '$ de descuento desde N', short: '$ x cantidad' },
};

export const MEASURE_LABEL: Record<Measure, string> = {
  KG: 'Kilogramo (stock en g)',
  G: 'Gramo',
  U: 'Unidad',
  L: 'Litro',
  ML: 'Mililitro',
};

// ---------------------------------------------------------------- Cantidades

/** Formatea stock o cantidad: KG se guarda en gramos. */
export function formatQty(amount: number | null | undefined, measure?: Measure | string | null): string {
  const n = Number(amount) || 0;
  if (measure === 'KG') {
    return Math.abs(n) >= 1000 ? `${formatNumber(Math.round(n / 10) / 100)} kg` : `${formatNumber(n)} g`;
  }
  if (measure === 'U' || !measure) return `${formatNumber(n)} u`;
  return `${formatNumber(n)} ${measure.toLowerCase()}`;
}

/** Tamaño de presentación: 250 → "250 g", 1000 → "1 kg". */
export function formatPack(size: number, measure?: Measure | string | null) {
  return formatQty(size, measure);
}

/** Unidad del precio: "/kg" o "/u". */
export function priceUnit(measure?: Measure | string | null) {
  return measure === 'KG' ? '/kg' : measure && measure !== 'U' ? `/${measure.toLowerCase()}` : '/u';
}

export function stockLevel(v: Pick<ProductVariant, 'currentStock' | 'stockThreshold'>): {
  tone: Tone;
  label: string;
} {
  if (v.currentStock <= 0) return { tone: 'danger', label: 'Sin stock' };
  if (v.stockThreshold > 0 && v.currentStock <= v.stockThreshold) return { tone: 'warning', label: 'Stock bajo' };
  return { tone: 'success', label: 'OK' };
}

/** Variante mix = tiene receta. */
export const isMix = (v: Pick<ProductVariant, 'hasComponents'>) => (v.hasComponents?.length ?? 0) > 0;

/** Productor local: lo que diga la variante o, si no lo define (null), el producto. */
export const isLocalVariant = (v: Pick<ProductVariant, 'isLocal' | 'local'>, productIsLocal?: boolean) =>
  !!(v.local ?? v.isLocal ?? productIsLocal);

/** Valor del select "Productor local" de una variante ('' = igual que el producto). */
export type LocalChoice = '' | 'true' | 'false';
export const toLocalChoice = (v: boolean | null | undefined): LocalChoice => (v == null ? '' : v ? 'true' : 'false');
export const fromLocalChoice = (c: LocalChoice): boolean | null => (c === '' ? null : c === 'true');
export const LOCAL_CHOICES = (productIsLocal?: boolean) => [
  { value: '' as const, label: `Igual que el producto (${productIsLocal ? 'local' : 'de marca'})` },
  { value: 'true' as const, label: 'Sí, productor local' },
  { value: 'false' as const, label: 'No, es de marca' },
];

/** Precio de venta: el backend lo calcula, pero lo replicamos para la vista previa de formularios. */
export function computeFinalPrice(price: number, margin = 0, rounding = 10) {
  if (!(price > 0)) return 0;
  const raw = price * (1 + (margin || 0));
  if (!(rounding > 0)) return Math.round(raw);
  return Math.ceil(Number((raw / rounding).toFixed(6))) * rounding;
}

// ---------------------------------------------------------------- Órdenes

const measureOfItem = (it: OrderItem) => it.productVariant?.contentMeasure;

/** Unidades de stock (g/u) que representa una línea. */
export function itemStockUnits(it: Pick<OrderItem, 'quantity' | 'selectedBulkOption'>) {
  return it.selectedBulkOption ? it.quantity * it.selectedBulkOption : it.quantity;
}

/** "2 × 500 g" o "300 g". */
export function describeItemQty(it: OrderItem) {
  const m = measureOfItem(it);
  return it.selectedBulkOption
    ? `${formatNumber(it.quantity)} × ${formatPack(it.selectedBulkOption, m)}`
    : formatQty(it.quantity, m);
}

/** Total de la línea = precio unitario × unidades de precio − descuento. */
export function itemTotal(it: OrderItem) {
  const units = itemStockUnits(it);
  const priceUnits = measureOfItem(it) === 'KG' ? units / 1000 : units;
  return Math.max(0, it.unitPriceSnapshot * priceUnits - (it.discountAppliedSnapshot || 0));
}

export const CLOSED_ITEM_STATUSES: OrderItemStatus[] = ['CANCELLED', 'RETURNED', 'OUT_OF_STOCK'];

// ---------------------------------------------------------------- Ofertas

/**
 * Precio por unidad de precio (kg/u) con la oferta aplicada a `priceUnits`
 * unidades. Espejo de `OfferService.applyOffer` del backend; la orden siempre
 * usa el cálculo del servidor, esto es solo para estimar.
 */
export function applyOfferPrice(
  unitPrice: number,
  priceUnits: number,
  o?: Pick<Offer, 'discountType' | 'discountValue' | 'discountQuantity' | 'quantityToGet'> | null,
): number {
  if (!o || priceUnits <= 0) return unitPrice;
  const value = Number(o.discountValue ?? 0);
  const from = Number(o.discountQuantity) || 0;
  switch (o.discountType) {
    case 'PERCENTAGE':
      return unitPrice * (1 - value / 100);
    case 'FIXED':
      return Math.max(0, unitPrice - value);
    case 'BUY_ONE_GET_MORE':
    case 'BUY_MORE_GET_MORE': {
      const take = from || 1;
      const pay = Number(o.quantityToGet) || take;
      if (priceUnits < take) return unitPrice;
      const sets = Math.floor(priceUnits / take);
      return ((sets * pay + (priceUnits - sets * take)) * unitPrice) / priceUnits;
    }
    case 'BUY_MORE_GET_DISCOUNT':
      return priceUnits >= from ? unitPrice * (1 - value / 100) : unitPrice;
    case 'BUY_MORE_GET_FIXED_DISCOUNT':
      return priceUnits >= from ? Math.max(0, unitPrice - value) : unitPrice;
    default:
      return unitPrice;
  }
}

export function describeOffer(o: Offer, measure?: Measure | string | null): string {
  const u = measure === 'KG' ? 'kg' : 'u';
  switch (o.discountType) {
    case 'PERCENTAGE':
      return `${formatNumber(o.discountValue)} % off`;
    case 'FIXED':
      return `−${formatCurrency(o.discountValue)} por ${u}`;
    case 'BUY_MORE_GET_MORE':
    case 'BUY_ONE_GET_MORE':
      return `${o.discountQuantity}x${o.quantityToGet}`;
    case 'BUY_MORE_GET_DISCOUNT':
      return `${formatNumber(o.discountValue)} % off desde ${o.discountQuantity} ${u}`;
    case 'BUY_MORE_GET_FIXED_DISCOUNT':
      return `−${formatCurrency(o.discountValue)} desde ${o.discountQuantity} ${u}`;
    default:
      return o.discountType;
  }
}

export type OfferState = 'active' | 'scheduled' | 'expired' | 'inactive';

export function offerState(o: Pick<Offer, 'active' | 'startTime' | 'finishTime'>, now = Date.now()): OfferState {
  if (!o.active) return 'inactive';
  if (new Date(o.startTime).getTime() > now) return 'scheduled';
  if (new Date(o.finishTime).getTime() < now) return 'expired';
  return 'active';
}

export const OFFER_STATE: Record<OfferState, { label: string; tone: Tone }> = {
  active: { label: 'Vigente', tone: 'success' },
  scheduled: { label: 'Programada', tone: 'info' },
  expired: { label: 'Vencida', tone: 'default' },
  inactive: { label: 'Inactiva', tone: 'danger' },
};

// ---------------------------------------------------------------- Códigos de descuento

export type CouponState = OfferState;

export const couponState = offerState;

export const COUPON_STATE: Record<CouponState, { label: string; tone: Tone }> = OFFER_STATE;

export const COUPON_TYPE: Record<string, { label: string; short: string }> = {
  PERCENTAGE: { label: 'Porcentaje', short: '% sobre el subtotal' },
  FIXED: { label: 'Monto fijo', short: '$ fijo sobre el subtotal' },
};

/** "10% hasta $5.000", "−$2.000"… para mostrar el beneficio del cupón. */
export function describeCoupon(c: Pick<DiscountCode, 'discountType' | 'discountValue' | 'maxDiscountAmount'>): string {
  if (c.discountType === 'PERCENTAGE') {
    const base = `${formatNumber(c.discountValue)} %`;
    return c.maxDiscountAmount ? `${base} (tope ${formatCurrency(c.maxDiscountAmount)})` : base;
  }
  return `−${formatCurrency(c.discountValue)}`;
}

// ---------------------------------------------------------------- Envíos

export const SHIPMENT_STATUS: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  PREPARING: { label: 'En preparación', tone: 'info' },
  READY_FOR_PICKUP: { label: 'Listo para retirar', tone: 'violet' },
  SHIPPED: { label: 'Despachado', tone: 'violet' },
  OUT_FOR_DELIVERY: { label: 'En reparto', tone: 'info' },
  FAILED_ATTEMPT: { label: 'Intento fallido', tone: 'danger' },
  DELIVERED: { label: 'Entregado', tone: 'success' },
  RETURNED: { label: 'Devuelto', tone: 'default' },
  CANCELLED: { label: 'Cancelado', tone: 'danger' },
};

/** Texto del botón para pasar a cada estado (para retiro, "Entregado" = retirado). */
export function shipmentActionLabel(to: ShipmentStatus, method: ShipmentMethod): string {
  switch (to) {
    case 'PREPARING':
      return 'Empezar a preparar';
    case 'READY_FOR_PICKUP':
      return 'Listo para retirar';
    case 'SHIPPED':
      return 'Despachar';
    case 'OUT_FOR_DELIVERY':
      return 'Salió a reparto';
    case 'FAILED_ATTEMPT':
      return 'Intento fallido';
    case 'DELIVERED':
      return method === 'PICKUP' ? 'Marcar retirado' : 'Marcar entregado';
    case 'RETURNED':
      return 'Marcar devuelto';
    case 'CANCELLED':
      return 'Cancelar envío';
    default:
      return SHIPMENT_STATUS[to]?.label ?? to;
  }
}

export const SHIPMENT_METHOD: Record<ShipmentMethod, string> = {
  DELIVERY: 'Envío a domicilio',
  PICKUP: 'Retiro en el local',
};

// ---------------------------------------------------------------- Envío a domicilio

/** Retiro / envío a domicilio de la orden (corto, para listados). */
export const SHIPPING_METHOD_SHORT: Record<ShipmentMethod, string> = {
  PICKUP: 'Retiro',
  DELIVERY: 'Envío a domicilio',
};

/** Quién cotizó/entrega el envío. */
export const SHIPPING_PROVIDER_LABEL: Record<string, string> = {
  own: 'Tarifa propia',
  uber: 'Uber Direct',
};
export const shippingProviderLabel = (p?: string | null) => (p ? SHIPPING_PROVIDER_LABEL[p] ?? p : null);

/** Estados de una entrega de Uber Direct. */
export const UBER_STATUS: Record<UberDeliveryStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Buscando repartidor', tone: 'warning' },
  pickup: { label: 'Repartidor yendo al local', tone: 'info' },
  pickup_complete: { label: 'Pedido retirado por el repartidor', tone: 'violet' },
  dropoff: { label: 'En camino al cliente', tone: 'info' },
  delivered: { label: 'Entregado', tone: 'success' },
  canceled: { label: 'Repartidor cancelado', tone: 'danger' },
  returned: { label: 'Devuelto al local', tone: 'default' },
};
export const uberStatus = (s?: string | null) =>
  s ? UBER_STATUS[s as UberDeliveryStatus] ?? { label: s, tone: 'default' as Tone } : null;

/** El envío tiene un repartidor de Uber en curso (pedido y no cancelado). */
export const hasActiveCourier = (s: Pick<Shipment, 'providerDeliveryId' | 'providerStatus'>) =>
  !!s.providerDeliveryId && s.providerStatus !== 'canceled';

/** Costo de envío cobrado en la orden (0 si es retiro o el backend no lo informa). */
export const orderShippingCost = (o: Pick<Order, 'shippingCost'>) => Number(o.shippingCost) || 0;

/** Lo que pagó el cliente: productos (`totalPrice`) − cupón + envío. */
export const orderChargedTotal = (o: Pick<Order, 'totalPrice' | 'shippingCost' | 'couponDiscount'>) =>
  Math.max(0, (Number(o.totalPrice) || 0) - (Number(o.couponDiscount) || 0)) + orderShippingCost(o);

// ---------------------------------------------------------------- Reseñas

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendiente', tone: 'warning' },
  APPROVED: { label: 'Aprobada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'danger' },
};

// ---------------------------------------------------------------- Banners

/** Respaldo mientras no llega `GET /banner/placements`. */
export const BANNER_PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  HOME_HERO: 'Portada (hero)',
  HOME_RECOMMENDATION: 'Recomendados de la portada',
  CATALOG_STRIP: 'Franja del catálogo',
  ANNOUNCEMENT_BAR: 'Barra de anuncios',
};

export const BANNER_SIZE_LABEL: Record<BannerSize, string> = {
  SQUARE: 'Cuadrado',
  WIDE: 'Ancho',
};

export type BannerState = 'live' | 'scheduled' | 'expired' | 'inactive';

export function bannerState(b: Pick<Banner, 'active' | 'startsAt' | 'endsAt'>, now = Date.now()): BannerState {
  if (!b.active) return 'inactive';
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return 'expired';
  return 'live';
}

export const BANNER_STATE: Record<BannerState, { label: string; tone: Tone }> = {
  live: { label: 'Vigente', tone: 'success' },
  scheduled: { label: 'Programado', tone: 'info' },
  expired: { label: 'Vencido', tone: 'default' },
  inactive: { label: 'Inactivo', tone: 'danger' },
};

// ---------------------------------------------------------------- Fechas

/** `YYYY-MM-DD` local → ISO (inicio o fin del día). */
export function dayToIso(day: string, end = false) {
  if (!day) return '';
  const d = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** ISO → valor para `<input type="datetime-local">`. */
export function isoToLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayInput(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
