import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmText?: string;
  variant?: 'danger' | 'warning';
  /** Acción a ejecutar; el diálogo muestra spinner y queda abierto si falla. */
  onConfirm: () => void | Promise<unknown>;
}

const ConfirmContext = createContext<((o: ConfirmOptions) => void) | null>(null);

/**
 * Un único diálogo de confirmación para toda la app:
 *   const confirm = useConfirm();
 *   confirm({ title: 'Desactivar', message: '¿Seguro?', onConfirm: () => setActive(id, false) });
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const last = useRef<ConfirmOptions | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    last.current = o;
    setOpts(o);
    setOpen(true);
  }, []);

  const current = opts ?? last.current;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current && (
        <ConfirmDialog
          isOpen={open}
          onClose={() => setOpen(false)}
          onConfirm={current.onConfirm}
          title={current.title}
          message={current.message}
          confirmText={current.confirmText}
          variant={current.variant}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}
