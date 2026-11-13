import { useState } from 'react';
import { useParams } from 'react-router';
import { Check, Clock, CreditCard, PackageX, RotateCcw, Truck, User, XCircle } from 'lucide-react';
import { ordersApi } from '../api/resources';
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
import { useAction } from '../hooks/useAction';
import {
  CLOSED_ITEM_STATUSES,
  DISCOUNT_TYPE,
  ORDER_STATUS,
  describeItemQty,
  itemTotal,
  paymentLabel,
  priceUnit,
} from '../lib/domain';
import { cn, formatCurrency, formatDate, formatDateTime, formatOrderNumber } from '../lib/utils';
import type { DiscountType } from '../api/types';

const FLOW: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function StatusStepper({ status }: { status: OrderStatus }) {
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
          <li key={s} className={cn('flex items-center', i < FLOW.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && !done && 'border-primary text-primary bg-primary/10',
                  !done && !active && 'border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={cn('text-xs whitespace-nowrap', active || done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {ORDER_STATUS[s].label}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div className={cn('mx-2 mb-5 h-0.5 flex-1 rounded', i < current ? 'bg-primary' : 'bg-border')} />
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
            <img src={i.productVariant.images[0].secure_url} alt="" className="h-10 w-10 rounded-md object-cover border border-border" />
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
                label: 'Marcar esperando stock',
                icon: <Clock className="w-4 h-4" />,
                onClick: () => setAwaiting(i),
                hidden: order.status === 'DELIVERED',
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
          <span className="flex items-center gap-3">
            Orden {formatOrderNumber(order.id)}
            <OrderStatusBadge status={order.status} />
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
            {label(to)}
          </Button>
        ))}
      />

      <Card>
        <StatusStepper status={order.status} />
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
          <Card className="space-y-4">
            <CardTitle>Cliente y pago</CardTitle>
            <InfoRow icon={<User className="w-4 h-4" />} label="Cliente">
              {order.user?.name || order.user?.email || 'Sin datos'}
              {order.user?.name && order.user?.email && <div className="text-xs text-muted-foreground">{order.user.email}</div>}
              <div className="font-mono text-xs text-muted-foreground">{order.userSuperTokensId}</div>
            </InfoRow>
            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Medio de pago">
              {paymentLabel(order.paymentType)}
            </InfoRow>
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

function OrderTotals({ order, subtotal, discounts }: { order: Order; subtotal: number; discounts: number }) {
  const diff = Math.abs(subtotal - discounts - order.totalPrice) > 1;
  return (
    <Card className="space-y-3">
      <CardTitle>Resumen</CardTitle>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Descuentos</span>
        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
          {discounts ? `−${formatCurrency(discounts)}` : formatCurrency(0)}
        </span>
      </div>
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-medium">Total</span>
        <span className="text-xl font-semibold tabular-nums">{formatCurrency(order.totalPrice)}</span>
      </div>
      {diff && (
        <Badge tone="info" className="whitespace-normal">
          El total lo calcula el servidor; puede diferir por redondeos o devoluciones prorrateadas.
        </Badge>
      )}
    </Card>
  );
}
