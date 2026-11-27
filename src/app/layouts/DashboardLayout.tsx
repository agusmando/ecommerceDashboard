import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router';
import { Link } from 'react-router';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CommandPalette } from '../components/CommandPalette';
import { useAppSelector } from '../store';
import { Card } from '../components/Card';
import { EmptyState } from '../components/States';
import { hasPermission, type Permission } from '../lib/permissions';

export interface RouteHandle {
  title?: string;
  /** Permiso necesario para ver la página (ver lib/permissions). */
  perm?: Permission;
}

/** Layout persistente de /dashboard/*: sidebar y header no se re-montan al navegar. */
export function DashboardLayout() {
  const status = useAppSelector((s) => s.auth.status);
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  const matches = useMatches();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handle = (matches[matches.length - 1]?.handle ?? {}) as RouteHandle;

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Drawer mobile: Escape lo cierra.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    document.title = handle.title ? `${handle.title} · Canela en Rama` : 'Canela en Rama · Admin';
  }, [handle.title]);

  if (status === 'checking') {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Validando sesión…</span>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={handle.title} onMenuClick={() => setMobileOpen(true)} />
        <CommandPalette />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
            {handle.perm && !hasPermission(user, handle.perm) ? <Forbidden /> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}

function Forbidden() {
  return (
    <Card>
      <EmptyState
        icon={<ShieldAlert className="w-6 h-6" />}
        title="No tenés acceso a esta sección"
        description="Tu rol no incluye este permiso. Si lo necesitás, pedíselo a un administrador."
        action={
          <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Ir al inicio
          </Link>
        }
      />
    </Card>
  );
}
