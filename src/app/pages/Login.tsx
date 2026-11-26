import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FormError } from '../components/States';
import { useAppDispatch, useAppSelector } from '../store';
import { clearNotice, safeReturnTo, signIn, startGoogleSignIn } from '../store/authSlice';
import { getErrorMessage } from '../api/client';
import { GoogleIcon } from '../components/auth/GoogleIcon';

const SHOP_URL = (import.meta.env.VITE_SHOP_URL || 'https://canelaenrama.com.ar').replace(/\/+$/, '');

export default function Login() {
  const dispatch = useAppDispatch();
  const { status, notice } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeReturnTo((location.state as { from?: string } | null)?.from);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (status === 'authenticated') return <Navigate to={redirectTo} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    dispatch(clearNotice());
    setLoading(true);
    const res = await dispatch(signIn({ email, password }));
    setLoading(false);
    if (signIn.fulfilled.match(res)) navigate(redirectTo, { replace: true });
    else setError(res.payload ?? 'No se pudo iniciar sesión.');
  };

  const handleGoogle = async () => {
    setError('');
    dispatch(clearNotice());
    setGoogleLoading(true);
    try {
      await startGoogleSignIn(redirectTo); // redirige a Google
    } catch (e) {
      setError(getErrorMessage(e) || 'No se pudo iniciar el ingreso con Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Panel de administración</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu usuario de staff</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || notice) && <FormError>{error || notice}</FormError>}

          <Input
            id="email"
            type="email"
            label="Email"
            autoComplete="username"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2.5 top-[34px] p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="-mt-1 text-right">
            {/* El enlace del mail de SuperTokens siempre lleva a la tienda (websiteDomain). */}
            <a href={`${SHOP_URL}/recuperar`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Button type="submit" className="w-full" loading={loading} disabled={googleLoading}>
            {!loading && <LogIn className="w-4 h-4" />}
            Ingresar
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" role="separator">
          <span className="h-px flex-1 bg-border" />
          o
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} loading={googleLoading} disabled={loading}>
          {!googleLoading && <GoogleIcon className="w-4 h-4" />}
          Ingresar con Google
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso solo para el equipo (con email o con Google): un administrador te asigna el rol desde{' '}
          <strong>Usuarios</strong>.
        </p>
      </Card>
    </AuthLayout>
  );
}
