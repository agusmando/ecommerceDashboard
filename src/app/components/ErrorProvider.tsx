import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ErrorOptions {
  title?: string;
  description: ReactNode;
}

const ErrorContext = createContext<((options: ErrorOptions) => void) | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ErrorOptions | null>(null);
  const last = useRef<ErrorOptions | null>(null);

  const showError = useCallback((next: ErrorOptions) => {
    last.current = next;
    setOptions(next);
  }, []);

  const current = options ?? last.current;

  return (
    <ErrorContext.Provider value={showError}>
      {children}
      {current && (
        <Modal
          isOpen={options !== null}
          onClose={() => setOptions(null)}
          title={current.title ?? 'No se pudo completar la acción'}
          size="sm"
          footer={<Button onClick={() => setOptions(null)}>Entendido</Button>}
        >
          <div className="flex gap-4" role="alert">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1 pt-1 text-sm text-foreground break-words">{current.description}</div>
          </div>
        </Modal>
      )}
    </ErrorContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorContext);
  if (!context) throw new Error('useErrorModal debe usarse dentro de ErrorProvider');
  return context;
}
