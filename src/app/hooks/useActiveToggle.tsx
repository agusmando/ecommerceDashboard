import { useCallback } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';
import type { Id } from '../api/types';
import { useConfirm } from '../components/ConfirmProvider';
import { useErrorModal } from '../components/ErrorProvider';

/**
 * Activar/desactivar con confirmación y toasts. Reutilizado por todos los
 * listados (categorías, marcas, productos, ofertas…).
 *
 *   const toggle = useActiveToggle(setActive, 'la categoría');
 *   toggle(row.id, row.name, row.active);
 */
export function useActiveToggle(setActive: (id: Id, active: boolean) => Promise<unknown>, noun: string) {
  const confirm = useConfirm();
  const showError = useErrorModal();
  return useCallback(
    (id: Id, name: string, currentlyActive: boolean) => {
      const run = async () => {
        try {
          await setActive(id, !currentlyActive);
          toast.success(`"${name}" ${currentlyActive ? 'desactivado' : 'activado'}`);
        } catch (e) {
          showError({
            title: `No se pudo ${currentlyActive ? 'desactivar' : 'activar'} ${noun}`,
            description: getErrorMessage(e),
          });
          throw e;
        }
      };
      if (!currentlyActive) return void run().catch(() => undefined);
      confirm({
        title: `Desactivar ${noun}`,
        message: (
          <>
            <strong>{name}</strong> dejará de estar disponible. Podés reactivarlo cuando quieras.
          </>
        ),
        confirmText: 'Desactivar',
        variant: 'warning',
        onConfirm: run,
      });
    },
    [confirm, noun, setActive, showError],
  );
}
