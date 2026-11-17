import { useCallback } from 'react';
import { toast } from 'sonner';
import { ordersApi } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import { ORDER_TRANSITIONS, type Order, type OrderStatus } from '../../api/types';
import { orderActionLabel, orderStatusInfo } from '../../lib/domain';
import { formatOrderNumber } from '../../lib/utils';
import { useConfirm } from '../ConfirmProvider';

/** Transiciones válidas desde el estado actual (espejo del backend). */
export const nextStatuses = (status: OrderStatus) => ORDER_TRANSITIONS[status] ?? [];

/**
 * Cambio de estado de una orden con toasts; cancelar pide confirmación
 * (el backend repone todo el stock con movimientos RETURN).
 */
export function useOrderStatusChange() {
  const [update, state] = ordersApi.useUpdate();
  const confirm = useConfirm();

  const change = useCallback(
    (order: Pick<Order, 'id' | 'status' | 'shippingMethod'>, to: OrderStatus) => {
      const run = async () => {
        try {
          await update(order.id, { status: to });
          toast.success(`Orden ${formatOrderNumber(order.id)}: ${orderStatusInfo(to, order.shippingMethod).label.toLowerCase()}`);
        } catch (e) {
          toast.error('No se pudo cambiar el estado', { description: getErrorMessage(e) });
          throw e;
        }
      };
      if (to !== 'CANCELLED') return void run().catch(() => undefined);
      confirm({
        title: `Cancelar orden ${formatOrderNumber(order.id)}`,
        message: (
          <>
            La orden pasará a <strong>Cancelada</strong> (estado final) y se repondrá todo el stock de sus ítems.
          </>
        ),
        confirmText: 'Cancelar orden',
        variant: 'danger',
        onConfirm: run,
      });
    },
    [confirm, update],
  );

  return { change, isLoading: state.isLoading, label: (to: OrderStatus, method?: string | null) => orderActionLabel(to, method) };
}
