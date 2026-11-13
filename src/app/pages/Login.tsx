import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FormError } from '../components/States';
import { useAppDispatch, useAppSelector } from '../store';
import { clearNotice, signIn } from '../store/authSlice';

export default function Login() {
  const dispatch = useAppDispatch();
  const { status, notice } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <AuthLayout>
      <Card className="p-8">
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

          <Button type="submit" className="w-full" loading={loading}>
            {!loading && <LogIn className="w-4 h-4" />}
            Ingresar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Se requiere rol <strong>ADMIN</strong> o <strong>EMPLOYEE</strong> (asignado desde el dashboard de SuperTokens).
        </p>
      </Card>
    </AuthLayout>
  );
}
