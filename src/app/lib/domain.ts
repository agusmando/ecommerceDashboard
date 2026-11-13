import type {
  DiscountType,
  Measure,
  MovementType,
  Offer,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
  PaymentType,
  ProductVariant,
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

export const ORDER_ITEM_STATUS: Record<OrderItemStatus, { label: string; tone: Tone }> = {
  FULFILLED: { label: 'Asignado', tone: 'success' },
  AWAITING_STOCK: { label: 'Esperando stock', tone: 'warning' },
  PARTIALLY_RETURNED: { label: 'Parcial', tone: 'info' },
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

export const paymentLabel = (p: string) => PAYMENT_LABEL[p as PaymentType] ?? p;

export const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: Tone; hint: string }> = {
  IN: { label: 'Ingreso', tone: 'success', hint: 'Entrada de mercadería (cantidad positiva)' },
  OUT: { label: 'Salida', tone: 'danger', hint: 'Venta, merma o pérdida (cantidad negativa)' },
  ADJUSTMENT: { label: 'Ajuste', tone: 'info', hint: 'Corrección de inventario (+/−)' },
  RETURN: { label: 'Devolución', tone: 'violet', hint: 'Devolución manual de un cliente' },
  PRODUCTION: { label: 'Producción', tone: 'warning', hint: 'Generado al producir un mix' },
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

export const CLOSED_ITEM_STATUSES: OrderItemStatus[] = ['CANCELLED', 'RETURNED'];

// ---------------------------------------------------------------- Ofertas

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

export function offerState(o: Offer, now = Date.now()): OfferState {
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
