import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { store, useAppDispatch, useAppSelector } from './store';
import { restoreSession } from './store/authSlice';
import { ConfirmProvider } from './components/ConfirmProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { router } from './routes';

/** Sincroniza el tema con <html> y valida la sesión guardada al arrancar. */
function Bootstrap() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (status === 'checking') dispatch(restoreSession());
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme={theme} position="top-right" richColors closeButton />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <ConfirmProvider>
          <Bootstrap />
        </ConfirmProvider>
      </TooltipProvider>
    </Provider>
  );
}
