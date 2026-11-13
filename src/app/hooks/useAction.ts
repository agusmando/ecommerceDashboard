import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '../api/client';

/**
 * Envuelve una acción async (normalmente una mutación) con estado de carga y
 * toasts de éxito/error, para no repetir try/catch en cada botón.
 *
 *   const [deactivate, busy] = useAction(
 *     (id: number) => setActive(id, false),
 *     { success: 'Categoría desactivada' },
 *   );
 */
export function useAction<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  messages: { success?: string | ((r: R) => string); error?: string } = {},
) {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (...args: A): Promise<R> => {
      setBusy(true);
      try {
        const r = await fn(...args);
        const msg = typeof messages.success === 'function' ? messages.success(r) : messages.success;
        if (msg) toast.success(msg);
        return r;
      } catch (e) {
        toast.error(messages.error ?? 'No se pudo completar la acción', { description: getErrorMessage(e) });
        throw e;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  return [run, busy] as const;
}
