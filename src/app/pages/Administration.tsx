import { CheckCircle2, Database, LogOut, Moon, RefreshCw, Server, Sun, Trash2, User as UserIcon, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useHealthQuery } from '../api/resources';
import { api } from '../api/baseApi';
import { API_BASE_URL, getErrorMessage } from '../api/client';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Skeleton } from '../components/States';
import { useAppDispatch, useAppSelector } from '../store';
import { signOut } from '../store/authSlice';
import { setTheme } from '../store/uiSlice';
import { resetFilters } from '../store/filtersSlice';
import { formatDateTime } from '../lib/utils';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-all sm:text-right">{children}</dd>
    </div>
  );
}

export default function Administration() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const theme = useAppSelector((s) => s.ui.theme);
  const filterKeys = useAppSelector((s) => Object.keys(s.filters));
  const health = useHealthQuery(undefined, { refetchOnMountOrArgChange: true });

  const clearCache = () => {
    dispatch(api.util.resetApiState());
    toast.success('Cache vaciada: los datos se vuelven a pedir al servidor');
  };

  return (
    <>
      <PageHeader title="Administración" description="Conexión con el backend, sesión y preferencias del panel." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <CardTitle>Conexión con la API</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => health.refetch()} loading={health.isFetching}>
              {!health.isFetching && <RefreshCw className="w-4 h-4" />}
              Probar
            </Button>
          </CardHeader>
          <dl className="divide-y divide-border">
            <Row label="URL base">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{API_BASE_URL}</code>
            </Row>
            <Row label="Estado">
              {health.isLoading ? (
                <Skeleton className="ml-auto h-5 w-24" />
              ) : health.error ? (
                <Badge tone="danger">
                  <XCircle className="w-3.5 h-3.5" /> Sin conexión
                </Badge>
              ) : (
                <Badge tone="success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> En línea
                </Badge>
              )}
            </Row>
            {health.data && <Row label="Latencia">{health.data.latencyMs} ms</Row>}
            {health.error ? <Row label="Detalle">{getErrorMessage(health.error)}</Row> : null}
            <Row label="Autenticación">SuperTokens · modo header (refresh automático)</Row>
          </dl>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <CardTitle>Sesión actual</CardTitle>
          </CardHeader>
          <dl className="divide-y divide-border">
            <Row label="Email">{user?.email ?? '—'}</Row>
            <Row label="Nombre">{user?.name || '—'}</Row>
            <Row label="Roles">
              <span className="inline-flex flex-wrap gap-1">
                {(user?.roles ?? []).map((r) => (
                  <Badge key={r} tone="info">
                    {r}
                  </Badge>
                ))}
              </span>
            </Row>
            <Row label="SuperTokens ID">
              <code className="text-xs">{user?.supertokensId}</code>
            </Row>
            <Row label="Usuario desde">{formatDateTime(user?.createdAt)}</Row>
          </dl>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={async () => {
                await dispatch(signOut());
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Los roles se asignan desde la sección Usuarios (solo administradores).
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant={theme === 'light' ? 'primary' : 'outline'} onClick={() => dispatch(setTheme('light'))}>
              <Sun className="w-4 h-4" /> Claro
            </Button>
            <Button variant={theme === 'dark' ? 'primary' : 'outline'} onClick={() => dispatch(setTheme('dark'))}>
              <Moon className="w-4 h-4" /> Oscuro
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <CardTitle>Datos en memoria</CardTitle>
          </CardHeader>
          <p className="text-sm text-muted-foreground">
            Las respuestas de la API se guardan en un store compartido (RTK Query) y se invalidan solas al modificar
            datos. Si alguien más cambió algo desde otro equipo, podés forzar la recarga.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearCache}>
              <RefreshCw className="w-4 h-4" />
              Recargar todos los datos
            </Button>
            <Button
              variant="outline"
              disabled={!filterKeys.length}
              onClick={() => {
                filterKeys.forEach((key) => dispatch(resetFilters({ key })));
                toast.success('Filtros restablecidos');
              }}
            >
              <Trash2 className="w-4 h-4" />
              Restablecer filtros ({filterKeys.length})
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
