import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  CalendarClock,
  ExternalLink,
  Hash,
  MapPin,
  NotebookPen,
  Pencil,
  Phone,
  RefreshCw,
  Truck,
  User,
  Wallet,
} from 'lucide-react';
import { shipmentsApi } from '../api/resources';
import { PageHeader } from '../components/PageHeader';
import { Card, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Badge, ShipmentStatusBadge } from '../components/Badge';
import { ErrorState, Skeleton } from '../components/States';
import { CopyCode, formatShipmentAddress, ShipmentTimeline, useShipmentTransitions } from '../components/shipments/ShipmentParts';
import { ShipmentFormModal } from '../components/shipments/ShipmentFormModal';
import { ShipmentStatusModal } from '../components/shipments/ShipmentStatusModal';
import { SHIPMENT_METHOD } from '../lib/domain';
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber } from '../lib/utils';

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

export default function ShipmentDetail() {
  const { id } = useParams();
  const shipmentId = Number(id);
  const { data: s, isLoading, error, refetch, isFetching } = shipmentsApi.useOne(shipmentId > 0 ? shipmentId : null);
  const { next } = useShipmentTransitions();
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (error || !s) {
    return (
      <>
        <PageHeader title="Envío" backTo="/dashboard/shipments" backLabel="Envíos" />
        <Card>
          <ErrorState error={error ?? new Error('El envío no existe.')} onRetry={refetch} title="No se pudo cargar el envío" />
        </Card>
      </>
    );
  }

  const options = next(s);
  const delivery = s.method === 'DELIVERY';
  const address = formatShipmentAddress(s);

  return (
    <>
      <PageHeader
        backTo="/dashboard/shipments"
        backLabel="Envíos"
        title={
          <span className="flex flex-wrap items-center gap-3">
            Envío {s.trackingCode}
            <ShipmentStatusBadge status={s.status} />
          </span>
        }
        description={
          <>
            {SHIPMENT_METHOD[s.method]} · orden{' '}
            <Link to={`/dashboard/orders/${s.orderId}`} className="font-medium text-primary hover:underline">
              {formatOrderNumber(s.orderId)}
            </Link>{' '}
            · creado el {formatDateTime(s.createdAt)}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Editar datos
            </Button>
            <Button onClick={() => setMoving(true)} disabled={!options.length || isFetching}>
              <RefreshCw className="w-4 h-4" /> Actualizar estado
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Historial</CardTitle>
            {!options.length && <Badge>Estado final</Badge>}
          </div>
          <ShipmentTimeline events={s.events ?? []} />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <CardTitle>Seguimiento</CardTitle>
            <InfoRow icon={<Hash className="w-4 h-4" />} label="Código público (para el cliente)">
              <CopyCode value={s.trackingCode} />
            </InfoRow>
            {delivery && (
              <InfoRow icon={<Truck className="w-4 h-4" />} label="Transportista">
                {s.carrier || <span className="text-muted-foreground">Sin asignar</span>}
                {s.carrierTrackingCode && <div className="font-mono text-xs text-muted-foreground">{s.carrierTrackingCode}</div>}
                {s.carrierTrackingUrl && (
                  <a
                    href={s.carrierTrackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Seguimiento del transportista <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </InfoRow>
            )}
            <InfoRow icon={<CalendarClock className="w-4 h-4" />} label={delivery ? 'Entrega estimada' : 'Retiro estimado'}>
              {formatDate(s.estimatedDeliveryAt)}
              {s.shippedAt && <div className="text-xs text-muted-foreground">{delivery ? 'Despachado' : 'Listo'} {formatDateTime(s.shippedAt)}</div>}
              {s.deliveredAt && <div className="text-xs text-muted-foreground">{delivery ? 'Entregado' : 'Retirado'} {formatDateTime(s.deliveredAt)}</div>}
            </InfoRow>
            <InfoRow icon={<Wallet className="w-4 h-4" />} label="Costo">
              {formatCurrency(s.cost)}
            </InfoRow>
          </Card>

          <Card className="space-y-4">
            <CardTitle>Destinatario</CardTitle>
            <InfoRow icon={<User className="w-4 h-4" />} label="Nombre">
              {s.recipientName || <span className="text-muted-foreground">—</span>}
            </InfoRow>
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono">
              {s.phone ? (
                <a href={`tel:${s.phone}`} className="hover:underline">
                  {s.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </InfoRow>
            {delivery && (
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Dirección">
                {address || <span className="text-muted-foreground">—</span>}
              </InfoRow>
            )}
            {s.notes && (
              <InfoRow icon={<NotebookPen className="w-4 h-4" />} label="Notas">
                <span className="whitespace-pre-line">{s.notes}</span>
              </InfoRow>
            )}
          </Card>
        </div>
      </div>

      <ShipmentFormModal isOpen={editing} onClose={() => setEditing(false)} shipment={s} />
      <ShipmentStatusModal isOpen={moving} onClose={() => setMoving(false)} shipment={s} />
    </>
  );
}
