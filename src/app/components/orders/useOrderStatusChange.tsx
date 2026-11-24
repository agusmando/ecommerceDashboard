import { useCallback } from 'react';
import { toast } from 'sonner';
import { ordersApi } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import { ORDER_TRANSITIONS, type Order, type OrderStatus } from '../../api/types';
import { ORDER_ACTION, ORDER_STATUS } from '../../lib/domain';
import { formatOrderNumber } from '../../lib/utils';
import { useConfirm } from '../ConfirmProvider';
import { useErrorModal } from '../ErrorProvider';

/** Transiciones válidas desde el estado actual (espejo del backend). */
export const nextStatuses = (status: OrderStatus) => ORDER_TRANSITIONS[status] ?? [];

/**
 * Cambio de estado de una orden con toasts; cancelar pide confirmación
 * (el backend repone todo el stock con movimientos RETURN).
 */
export function useOrderStatusChange() {
  const [update, state] = ordersApi.useUpdate();
  const confirm = useConfirm();
  const showError = useErrorModal();

  const change = useCallback(
    (order: Pick<Order, 'id' | 'status'>, to: OrderStatus) => {
      const run = async () => {
        try {
          await update(order.id, { status: to });
          toast.success(`Orden ${formatOrderNumber(order.id)}: ${ORDER_STATUS[to].label.toLowerCase()}`);
        } catch (e) {
          showError({ title: 'No se pudo cambiar el estado', description: getErrorMessage(e) });
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
    [confirm, update, showError],
  );

  return { change, isLoading: state.isLoading, label: (to: OrderStatus) => ORDER_ACTION[to] };
}
