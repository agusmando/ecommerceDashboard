import { Link } from 'react-router';
import { Bike, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import {
  useCancelShipmentCourierMutation,
  useDispatchShipmentMutation,
  useShippingConfigQuery,
  useSyncShipmentCourierMutation,
} from '../../api/resources';
import { SHIPMENT_FINAL_STATUSES, type Shipment } from '../../api/types';
import { hasActiveCourier, uberStatus } from '../../lib/domain';
import { cn } from '../../lib/utils';
import { useAction } from '../../hooks/useAction';
import { useConfirm } from '../ConfirmProvider';
import { Badge } from '../Badge';
import { Button } from '../Button';

/** Estados de Uber en los que ya no tiene sentido cancelar el repartidor. */
const UBER_DONE = ['delivered', 'returned', 'canceled'];

/**
 * Repartidor de Uber Direct para un envío a domicilio: solicitarlo, seguirlo,
 * re-consultar su estado o cancelarlo. Solo aparece si Uber está configurado en
 * el servidor (el backend además sincroniza solo cada 5 minutos).
 */
export function CourierPanel({ shipment: s, compact = false }: { shipment: Shipment; compact?: boolean }) {
  const config = useShippingConfigQuery();
  const confirm = useConfirm();
  const [dispatch] = useDispatchShipmentMutation();
  const [sync] = useSyncShipmentCourierMutation();
  const [cancel] = useCancelShipmentCourierMutation();

  const [runDispatch, dispatching] = useAction(() => dispatch(s.id).unwrap(), {
    success: (r) => `Repartidor solicitado: ${uberStatus(r.providerStatus)?.label ?? 'pedido enviado a Uber'}`,
    error: 'No se pudo solicitar el repartidor',
  });
  const [runSync, syncing] = useAction(() => sync(s.id).unwrap(), {
    success: (r) => `Estado en Uber: ${uberStatus(r.providerStatus)?.label ?? 'sin cambios'}`,
    error: 'No se pudo consultar el estado en Uber',
  });
  const [runCancel] = useAction(() => cancel(s.id).unwrap(), {
    success: 'Repartidor cancelado. Podés volver a solicitar uno.',
    error: 'No se pudo cancelar el repartidor',
  });

  if (s.method !== 'DELIVERY') return null;

  const uber = config.data?.providers.uber;
  const final = SHIPMENT_FINAL_STATUSES.includes(s.status);
  const active = hasActiveCourier(s);
  const status = s.provider === 'uber' ? uberStatus(s.providerStatus) : null;
  const busy = dispatching || syncing;

  // Sin Uber configurado: solo una pista discreta (y el estado, si quedó de antes).
  if (!uber) {
    if (config.isLoading || config.error) return null;
    if (status) {
      return (
        <Wrapper compact={compact}>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </Wrapper>
      );
    }
    return compact ? null : (
      <p className="text-xs text-muted-foreground">
        Uber Direct no está configurado: el envío se coordina a mano. Ver{' '}
        <Link to="/dashboard/shipping-zones" className="font-medium text-primary hover:underline">
          Tarifas de envío
        </Link>
        .
      </p>
    );
  }

  const missing = !s.address || !s.phone;

  const askDispatch = () =>
    confirm({
      title: 'Solicitar repartidor',
      message: (
        <>
          Se pedirá un repartidor de Uber Direct para retirar el pedido en el local y llevarlo a{' '}
          <strong>{s.address}</strong>. Hacelo cuando el pedido esté listo para salir.
        </>
      ),
      confirmText: 'Solicitar repartidor',
      variant: 'warning',
      onConfirm: () => runDispatch().catch(() => undefined),
    });

  const askCancel = () =>
    confirm({
      title: 'Cancelar repartidor',
      message: 'Se cancelará la entrega en Uber Direct. El envío queda como está y podés volver a solicitar un repartidor.',
      confirmText: 'Cancelar repartidor',
      variant: 'danger',
      onConfirm: () => runCancel().catch(() => undefined),
    });

  return (
    <Wrapper compact={compact}>
      {status && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Uber</span>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>
      )}

      {active ? (
        <div className="flex flex-wrap gap-2">
          {s.carrierTrackingUrl && (
            <a
              href={s.carrierTrackingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              <ExternalLink className="w-4 h-4" /> Seguir repartidor
            </a>
          )}
          <Button size="sm" variant="outline" onClick={() => runSync().catch(() => undefined)} loading={syncing} disabled={busy}>
            <RefreshCw className="w-4 h-4" /> Actualizar estado
          </Button>
          {!final && !UBER_DONE.includes(String(s.providerStatus)) && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={askCancel} disabled={busy}>
              <XCircle className="w-4 h-4" /> Cancelar repartidor
            </Button>
          )}
        </div>
      ) : (
        !final && (
          <div className="space-y-1">
            <Button size="sm" onClick={askDispatch} loading={dispatching} disabled={busy || missing}>
              <Bike className="w-4 h-4" /> Solicitar repartidor (Uber)
            </Button>
            {missing && <p className="text-xs text-muted-foreground">Cargá la dirección y el teléfono del envío para poder pedirlo.</p>}
          </div>
        )
      )}
      {active && !compact && (
        <p className="text-xs text-muted-foreground">El estado se sincroniza solo cada 5 minutos.</p>
      )}
    </Wrapper>
  );
}

function Wrapper({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  return <div className={cn('space-y-2', compact ? 'border-t border-border pt-4' : '')}>{children}</div>;
}
