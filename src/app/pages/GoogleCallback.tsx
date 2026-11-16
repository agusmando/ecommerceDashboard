import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { Card } from '../components/Card';
import { GoogleIcon } from '../components/auth/GoogleIcon';
import { useAppDispatch, useAppSelector } from '../store';
import { finishGoogleSignIn } from '../store/authSlice';

/**
 * Google redirige acá (`/auth/callback/google?code&state`). Completa el signinup
 * y vuelve a la página pedida; si falla, el mensaje queda en `auth.notice` y se
 * muestra en /login.
 */
export default function GoogleCallback() {
  const [params] = useSearchParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((s) => s.auth.status);
  const ran = useRef(false);

  useEffect(() => {
    // Esperamos a que termine restoreSession (si había tokens viejos) para no pisar los nuevos.
    if (status === 'checking' || ran.current) return;
    ran.current = true; // StrictMode: el código de Google es de un solo uso
    dispatch(finishGoogleSignIn(params)).then((res) => {
      if (finishGoogleSignIn.fulfilled.match(res)) navigate(res.payload.returnTo, { replace: true });
      else navigate('/login', { replace: true });
    });
  }, [dispatch, navigate, params, status]);

  return (
    <AuthLayout>
      <Card className="p-8">
        <div className="flex flex-col items-center text-center">
          <GoogleIcon className="w-10 h-10" />
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Ingresando con Google…
          </p>
        </div>
      </Card>
    </AuthLayout>
  );
}
