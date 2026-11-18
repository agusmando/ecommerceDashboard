import { useState } from 'react';
import { useParams } from 'react-router';
import { Check, Clock, CreditCard, HandCoins, MapPin, PackageCheck, PackageX, RotateCcw, Store, Truck, User, XCircle } from 'lucide-react';
import { ordersApi, useSyncOrderPaymentMutation } from '../api/resources';
import type { Order, OrderItem, OrderStatus } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { DataTable, type Column } from '../components/DataTable';
import { OrderItemStatusBadge, OrderStatusBadge, Badge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { ErrorState, Skeleton } from '../components/States';
import { useConfirm } from '../components/ConfirmProvider';
import { AwaitingStockModal, PartialReturnModal } from '../components/orders/ItemModals';
import { nextStatuses, useOrderStatusChange } from '../components/orders/useOrderStatusChange';
import { OrderShipmentCard } from '../components/shipments/OrderShipmentCard';
import { useAction } from '../hooks/useAction';
import {
  CLOSED_ITEM_STATUSES,
  DISCOUNT_TYPE,
  ORDER_STATUS,
  orderStatusInfo,
  PAYMENT_STATUS,
  SHIPPING_METHOD_SHORT,
  describeItemQty,
  itemTotal,
  orderChargedTotal,
  orderShippingCost,
  paymentLabel,
  priceUnit,
  shippingProviderLabel,
} from '../lib/domain';
import { cn, formatCurrency, formatDate, formatDateTime, formatOrderNumber } from '../lib/utils';
import { RefundModal } from '../components/orders/RefundModal';
import { useCan } from '../hooks/useCan';
import type { DiscountType } from '../api/types';
import { cld } from '../lib/cloudinary';

const FLOW: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function StatusStepper({ status, method }: { status: OrderStatus; method?: string | null }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <XCircle className="w-5 h-5 shrink-0" />
        Orden cancelada. El stock de sus ítems ya fue repuesto.
      </div>
    );
  }
  const current = FLOW.indexOf(status);
  return (
    <ol className="flex items-center">
      {FLOW.map((s, i) => {
        const done = i < current || status === 'DELIVERED';
        const active = i === current;
        return (
          <li key={s} className={cn('flex min-w-0 items-center', i < FLOW.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && !done && 'border-primary text-primary bg-primary/10',
                  !done && !active && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={cn('text-center text-[11px] leading-tight sm:text-xs sm:whitespace-nowrap', active || done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {orderStatusInfo(s, method).label}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div className={cn('mx-1 mb-5 h-0.5 min-w-2 flex-1 rounded sm:mx-2', i < current ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{children}</div>
      </div>
    </div>
  );
}

const ACTION_ICON: Partial<Record<OrderStatus, React.ReactNode>> = {
  PROCESSING: <Check className="w-4 h-4" />,
  SHIPPED: <Truck className="w-4 h-4" />,
  DELIVERED: <Check className="w-4 h-4" />,
  PENDING: <RotateCcw className="w-4 h-4" />,
  CANCELLED: <XCircle className="w-4 h-4" />,
};

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading, error, refetch, isFetching } = ordersApi.useOne(orderId > 0 ? orderId : null);
  const { change, label, isLoading: changing } = useOrderStatusChange();
  const [update] = ordersApi.useUpdate();
  const confirm = useConfirm();
  const [partial, setPartial] = useState<OrderItem | null>(null);
  const [awaiting, setAwaiting] = useState<OrderItem | null>(null);

  const [closeItem] = useAction(
    (item: OrderItem, status: 'RETURNED' | 'CANCELLED') => update(orderId, { editItem: [{ id: item.id, status }] }),
    { success: 'Ítem actualizado', error: 'No se pudo actualizar el ítem' },
  );
  const [stockArrived] = useAction(
    (item: OrderItem) => update(orderId, { editItem: [{ id: item.id, status: 'FULFILLED' }] }),
    { success: 'Stock recibido: el ítem ya no espera reposición', error: 'No se pudo actualizar el ítem' },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !order) {
    return (
      <>
        <PageHeader title="Orden" backTo="/dashboard/orders" backLabel="Órdenes" />
        <Card>
          <ErrorState error={error ?? new Error('La orden no existe.')} onRetry={refetch} title="No se pudo cargar la orden" />
        </Card>
      </>
    );
  }

  const items = order.orderItems ?? [];
  const canEditItems = order.status !== 'CANCELLED';
  const subtotal = items
    .filter((i) => !CLOSED_ITEM_STATUSES.includes(i.status))
    .reduce((acc, i) => acc + itemTotal(i) + (i.discountAppliedSnapshot || 0), 0);
  const discounts = items
    .filter((i) => !CLOSED_ITEM_STATUSES.includes(i.status))
    .reduce((acc, i) => acc + (i.discountAppliedSnapshot || 0), 0);

  const askClose = (item: OrderItem, status: 'RETURNED' | 'CANCELLED') =>
    confirm({
      title: status === 'RETURNED' ? 'Devolver ítem' : 'Cancelar ítem',
      message: (
        <>
          Se repondrá al stock todo <strong>{item.productNameSnapshot} · {item.variantNameSnapshot}</strong> (
          {describeItemQty(item)}) y se recalculará el total. Si todas las líneas quedan cerradas, la orden pasa a
          Cancelada.
        </>
      ),
      confirmText: status === 'RETURNED' ? 'Devolver' : 'Cancelar ítem',
      variant: 'danger',
      onConfirm: () => closeItem(item, status),
    });

  const columns: Column<OrderItem>[] = [
    {
      key: 'product',
      header: 'Producto',
      cell: (i) => (
        <div className="flex items-center gap-3 min-w-0">
          {i.productVariant?.images?.[0] ? (
            <img src={cld(i.productVariant.images[0].secure_url, { w: 80, h: 80 })} alt="" loading="lazy" decoding="async" className="h-10 w-10 rounded-md object-cover border border-border" />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted" />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{i.productNameSnapshot}</div>
            <div className="text-xs text-muted-foreground truncate">{i.variantNameSnapshot}</div>
          </div>
        </div>
      ),
    },
    { key: 'qty', header: 'Cantidad', cell: (i) => <span className="whitespace-nowrap">{describeItemQty(i)}</span> },
    {
      key: 'unit',
      header: 'Precio',
      align: 'right',
      hideOnMobile: true,
      cell: (i) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatCurrency(i.unitPriceSnapshot)}
          <span className="text-muted-foreground">{priceUnit(i.productVariant?.contentMeasure)}</span>
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Descuento',
      align: 'right',
      hideOnMobile: true,
      cell: (i) =>
        i.discountAppliedSnapshot ? (
          <div>
            <div className="tabular-nums text-emerald-700 dark:text-emerald-400">−{formatCurrency(i.discountAppliedSnapshot)}</div>
            {i.offerTypeSnapshot && (
              <div className="text-xs text-muted-foreground">
                {DISCOUNT_TYPE[i.offerTypeSnapshot as DiscountType]?.short ?? i.offerTypeSnapshot}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (i) => (
        <span className={cn('font-medium tabular-nums', CLOSED_ITEM_STATUSES.includes(i.status) && 'line-through text-muted-foreground')}>
          {formatCurrency(itemTotal(i))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (i) => (
        <div className="space-y-1">
          <OrderItemStatusBadge status={i.status} />
          {i.awaitingStockAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDate(i.awaitingStockAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (i) =>
        canEditItems && !CLOSED_ITEM_STATUSES.includes(i.status) ? (
          <RowActions
            actions={[
              {
                label: 'Devolución parcial',
                icon: <RotateCcw className="w-4 h-4" />,
                onClick: () => setPartial(i),
                disabled: i.quantity <= 1,
              },
              {
                label: i.status === 'AWAITING_STOCK' ? 'Cambiar fecha de reposición' : 'Marcar esperando stock',
                icon: <Clock className="w-4 h-4" />,
                onClick: () => setAwaiting(i),
                hidden: order.status === 'DELIVERED',
              },
              {
                label: 'Stock recibido',
                icon: <PackageCheck className="w-4 h-4" />,
                onClick: () => stockArrived(i).catch(() => undefined),
                hidden: !(i.status === 'AWAITING_STOCK' || i.awaitingStockAt),
              },
              {
                label: 'Devolver ítem',
                icon: <PackageX className="w-4 h-4" />,
                onClick: () => askClose(i, 'RETURNED'),
                separator: true,
              },
              {
                label: 'Cancelar ítem',
                icon: <XCircle className="w-4 h-4" />,
                onClick: () => askClose(i, 'CANCELLED'),
                danger: true,
                hidden: order.status === 'DELIVERED',
              },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        backTo="/dashboard/orders"
        backLabel="Órdenes"
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Orden {formatOrderNumber(order.id)}
            <OrderStatusBadge status={order.status} method={order.shippingMethod ?? order.shipment?.method} />
            {order.channel === 'COUNTER' && <Badge tone="default">Venta de mostrador</Badge>}
          </span>
        }
        description={`Creada el ${formatDateTime(order.createdAt)} · actualizada ${formatDateTime(order.updatedAt)}`}
        actions={nextStatuses(order.status).map((to) => (
          <Button
            key={to}
            variant={to === 'CANCELLED' ? 'outline' : to === 'PENDING' ? 'ghost' : 'primary'}
            className={to === 'CANCELLED' ? 'text-destructive' : undefined}
            disabled={changing || isFetching}
            onClick={() => change(order, to)}
          >
            {ACTION_ICON[to]}
            {label(to, order.shippingMethod ?? order.shipment?.method)}
          </Button>
        ))}
      />

      <Card>
        <StatusStepper status={order.status} method={order.shippingMethod ?? order.shipment?.method} />
        {order.status === 'DELIVERED' && (
          <p className="mt-4 text-xs text-muted-foreground">
            Estado final: solo se admiten devoluciones de ítems.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold">Ítems ({items.length})</h2>
          <DataTable columns={columns} rows={items} rowKey={(i) => i.id} fetching={isFetching} empty={{ title: 'La orden no tiene ítems' }} />
        </div>

        <div className="space-y-6">
          <OrderShipmentCard order={order} />

          <Card className="space-y-4">
            <CardTitle>Cliente y pago</CardTitle>
            <InfoRow icon={<User className="w-4 h-4" />} label="Cliente">
              {order.user?.name || order.user?.email || 'Sin datos'}
              {order.user?.name && order.user?.email && <div className="text-xs text-muted-foreground">{order.user.email}</div>}
              <div className="font-mono text-xs text-muted-foreground">{order.userSuperTokensId}</div>
            </InfoRow>
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Medio de pago">
              {paymentLabel(order.paymentType)}
              {order.paymentType === 'MERCADOPAGO' && <MercadoPagoStatus order={order} />}
            </InfoRow>
            <DeliveryInfo order={order} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Entrega / retiro estimado">
              {order.estimatedReadyAt ? formatDateTime(order.estimatedReadyAt) : 'Inmediata'}
            </InfoRow>
          </Card>

          <OrderTotals order={order} subtotal={subtotal} discounts={discounts} />
        </div>
      </div>

      <PartialReturnModal orderId={order.id} item={partial} onClose={() => setPartial(null)} />
      <AwaitingStockModal orderId={order.id} item={awaiting} onClose={() => setAwaiting(null)} />
    </>
  );
}

/** Modalidad de entrega elegida al comprar: retiro o envío (con proveedor y departamento). */
function DeliveryInfo({ order }: { order: Order }) {
  const method = order.shippingMethod ?? order.shipment?.method;
  if (!method) return null;
  const delivery = method === 'DELIVERY';
  const provider = shippingProviderLabel(order.shippingProvider);
  const zone = order.shippingZone ?? order.shipment?.zone;
  return (
    <InfoRow icon={delivery ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />} label="Entrega">
      <div className="flex flex-wrap items-center gap-1.5">
        <span>{SHIPPING_METHOD_SHORT[method]}</span>
        {delivery && provider && <Badge tone={order.shippingProvider === 'uber' ? 'violet' : 'default'}>{provider}</Badge>}
      </div>
      {delivery && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {zone && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {zone}
            </span>
          )}
          <span>Costo de envío {formatCurrency(orderShippingCost(order))}</span>
        </div>
      )}
    </InfoRow>
  );
}

function OrderTotals({ order, subtotal, discounts }: { order: Order; subtotal: number; discounts: number }) {
  const diff = Math.abs(subtotal - discounts - Number(order.totalPrice)) > 1;
  const shipping = orderShippingCost(order);
  const delivery = (order.shippingMethod ?? order.shipment?.method) === 'DELIVERY';
  return (
    <Card className="space-y-3">
      <CardTitle>Resumen</CardTitle>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal productos</span>
        <span className="tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Descuentos</span>
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
          {discounts ? `−${formatCurrency(discounts)}` : formatCurrency(0)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Envío</span>
        <span className="tabular-nums">
          {shipping ? formatCurrency(shipping) : <span className="text-muted-foreground">{delivery ? 'Gratis' : 'Retiro · sin costo'}</span>}
        </span>
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-medium">Total cobrado</span>
        <span className="text-xl font-semibold tabular-nums">{formatCurrency(orderChargedTotal(order))}</span>
      </div>
      {shipping > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Ventas de productos</span>
          <span className="tabular-nums">{formatCurrency(order.totalPrice)}</span>
        </div>
      )}
      {diff && (
        <Badge tone="info" className="whitespace-normal">
          El total lo calcula el servidor; puede diferir por redondeos o devoluciones prorrateadas.
        </Badge>
      )}
    </Card>
  );
}

/**
 * Estado del cobro en Mercado Pago + botón para re-consultarlo (por si el webhook
 * no llegó) y, para administradores, devolver dinero (total o parcial).
 */
function MercadoPagoStatus({ order }: { order: Order }) {
  const [sync, { isLoading }] = useSyncOrderPaymentMutation();
  const [run, busy] = useAction(() => sync(order.id).unwrap(), {
    success: (o) => `Pago: ${PAYMENT_STATUS[o.paymentStatus ?? 'PENDING'].label}`,
  });
  const can = useCan();
  const [refunding, setRefunding] = useState(false);
  const status = order.paymentStatus ?? 'PENDING';
  const refunded = Number(order.refundedAmount) || 0;
  const paid = order.paidAmount != null ? Number(order.paidAmount) : null;
  // Cobrado de más: productos devueltos/cancelados después de pagar, o pedido cancelado
  const owed =
    paid == null || status !== 'APPROVED'
      ? 0
      : Math.round((paid - refunded - (order.status === 'CANCELLED' ? 0 : orderChargedTotal(order))) * 100) / 100;
  const canRefund = can('payments.refund') && status === 'APPROVED' && !!order.paymentId;

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PAYMENT_STATUS[status].tone} dot>
          {PAYMENT_STATUS[status].label}
        </Badge>
        <Button size="sm" variant="outline" onClick={() => run()} disabled={busy || isLoading}>
          <RotateCcw className="w-3.5 h-3.5" /> Consultar en Mercado Pago
        </Button>
        {canRefund && (
          <Button size="sm" variant="outline" onClick={() => setRefunding(true)}>
            <HandCoins className="w-3.5 h-3.5" /> Devolver dinero
          </Button>
        )}
      </div>
      {order.paidAt && <div className="text-xs text-muted-foreground">Acreditado el {formatDateTime(order.paidAt)}</div>}
      {order.paymentId && <div className="font-mono text-xs text-muted-foreground">Pago #{order.paymentId}</div>}
      {paid != null && <div className="text-xs text-muted-foreground">Cobrado {formatCurrency(paid)}</div>}
      {refunded > 0 && (
        <div className="text-xs">
          <span className="font-medium">Devuelto {formatCurrency(refunded)}</span>
          {!!order.refunds?.length && (
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {order.refunds.map((r) => (
                <li key={r.id}>
                  {formatDateTime(r.createdAt)} · {formatCurrency(r.amount)}
                  {r.reason && <> · {r.reason}</>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {owed > 1 && order.paymentStatusDetail !== 'paid_after_cancel' && (
        <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Hay {formatCurrency(owed)} cobrados de más{canRefund ? ': podés devolverlos con «Devolver dinero».' : '. Pedile a un administrador que los devuelva.'}
        </div>
      )}
      {order.paymentStatusDetail === 'paid_after_cancel' && (
        <div className="text-xs font-medium text-red-600">
          Se pagó después de cancelar: hay que devolver el pago{canRefund ? ' con «Devolver dinero».' : ' (lo hace un administrador).'}
        </div>
      )}
      {order.paymentStatusDetail === 'amount_mismatch' && (
        <div className="text-xs font-medium text-red-600">El importe pagado no coincide con el total: revisalo en Mercado Pago.</div>
      )}
      {canRefund && <RefundModal order={order} open={refunding} onClose={() => setRefunding(false)} />}
    </div>
  );
}
