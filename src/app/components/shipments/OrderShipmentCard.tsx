import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Plus, RefreshCw, Truck } from 'lucide-react';
import { useShipmentByOrderQuery } from '../../api/resources';
import type { Order } from '../../api/types';
import { SHIPMENT_METHOD, orderShippingCost, shippingProviderLabel } from '../../lib/domain';
import { formatDate } from '../../lib/utils';
import { Card, CardTitle } from '../Card';
import { Button } from '../Button';
import { ShipmentStatusBadge } from '../Badge';
import { ErrorState, Skeleton } from '../States';
import { CopyCode, formatShipmentAddress, ShipmentTimeline, useShipmentTransitions } from './ShipmentParts';
import { ShipmentFormModal } from './ShipmentFormModal';
import { ShipmentStatusModal } from './ShipmentStatusModal';
import { CourierPanel } from './CourierPanel';

const MAX_EVENTS = 3;

/**
 * Tarjeta "Envío" del detalle de una orden. `GET /order/:id` ya trae `shipment`;
 * si el payload no lo incluye se consulta `GET /shipment/order/:orderId` (404 = sin envío).
 */
export function OrderShipmentCard({ order }: { order: Order }) {
  const embedded = order.shipment !== undefined;
  const q = useShipmentByOrderQuery(order.id, { skip: embedded });
  const shipment = embedded ? order.shipment : q.data;
  const { next } = useShipmentTransitions();
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(false);

  const loading = !embedded && q.isLoading;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Envío</CardTitle>
        {shipment && <ShipmentStatusBadge status={shipment.status} />}
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : !embedded && q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} title="No se pudo cargar el envío" className="py-4" />
      ) : shipment ? (
        <>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Seguimiento</span>
              <CopyCode value={shipment.trackingCode} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Modalidad</span>
              <span>{SHIPMENT_METHOD[shipment.method]}</span>
            </div>
            {shipment.method === 'DELIVERY' && (shipment.provider || order.shippingProvider) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Proveedor</span>
                <span className="truncate">{shippingProviderLabel(shipment.provider ?? order.shippingProvider)}</span>
              </div>
            )}
            {shipment.method === 'DELIVERY' && (shipment.zone || order.shippingZone) && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Departamento</span>
                <span className="truncate">{shipment.zone ?? order.shippingZone}</span>
              </div>
            )}
            {shipment.carrier && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Transportista</span>
                <span className="truncate">{shipment.carrier}</span>
              </div>
            )}
            {shipment.method === 'DELIVERY' && formatShipmentAddress(shipment) && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Dirección</span>
                <span className="min-w-0 break-words text-right">{formatShipmentAddress(shipment)}</span>
              </div>
            )}
            {shipment.recipientName && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Destinatario</span>
                <span className="truncate">{shipment.recipientName}</span>
              </div>
            )}
            {shipment.phone && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Teléfono</span>
                <a href={`tel:${shipment.phone}`} className="truncate hover:underline">
                  {shipment.phone}
                </a>
              </div>
            )}
            {shipment.estimatedDeliveryAt && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Estimado</span>
                <span>{formatDate(shipment.estimatedDeliveryAt)}</span>
              </div>
            )}
          </div>

          <CourierPanel shipment={shipment} compact />

          <div className="border-t border-border pt-4">
            <ShipmentTimeline events={(shipment.events ?? []).slice(-MAX_EVENTS)} compact />
            {(shipment.events?.length ?? 0) > MAX_EVENTS && (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando los últimos {MAX_EVENTS} de {shipment.events.length} eventos.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {next(shipment).length > 0 && (
              <Button size="sm" onClick={() => setMoving(true)}>
                <RefreshCw className="w-4 h-4" /> Actualizar estado
              </Button>
            )}
            <Link
              to={`/dashboard/shipments/${shipment.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              Gestionar envío <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <ShipmentStatusModal isOpen={moving} onClose={() => setMoving(false)} shipment={shipment} />
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Truck className="mt-0.5 w-4 h-4 shrink-0" />
            {order.status === 'CANCELLED'
              ? 'La orden está cancelada: no se puede crear un envío.'
              : 'Esta orden todavía no tiene envío ni retiro registrado.'}
          </div>
          {order.status !== 'CANCELLED' && (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Crear envío
            </Button>
          )}
          <ShipmentFormModal
            isOpen={creating}
            onClose={() => setCreating(false)}
            orderId={order.id}
            suggested={{ recipientName: order.user?.name, method: order.shippingMethod, cost: orderShippingCost(order) }}
          />
        </div>
      )}
    </Card>
  );
}
