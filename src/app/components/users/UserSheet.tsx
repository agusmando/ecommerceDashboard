import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Check, LogOut, Minus, ShieldCheck } from 'lucide-react';
import { useRevokeUserSessionsMutation, useRoleCatalogQuery, useSetUserRoleMutation, useUserDetailQuery } from '../../api/resources';
import type { ManagedUser, OrderStatus } from '../../api/types';
import { getErrorMessage } from '../../api/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { Button } from '../Button';
import { OrderStatusBadge } from '../Badge';
import { FormError, Skeleton } from '../States';
import { useConfirm } from '../ConfirmProvider';
import { useAction } from '../../hooks/useAction';
import { PERMISSION_LABEL, ROLE_LABEL, type Permission } from '../../lib/permissions';
import { formatDate, formatRelative } from '../../lib/utils';
import { RolePicker, type RoleChoice } from './RolePicker';
import { RoleBadge, UserAvatar } from './UserBits';

const LOGIN_LABEL: Record<string, string> = { email: 'Email y contraseña', google: 'Google' };

/** Detalle del usuario: rol, permisos efectivos y acciones (cambiar rol, cerrar sesiones). */
export function UserSheet({ user, isSelf, onClose }: { user: ManagedUser | null; isSelf: boolean; onClose: () => void }) {
  const confirm = useConfirm();
  const { data: roles } = useRoleCatalogQuery();
  const { data: detail, isLoading } = useUserDetailQuery(user?.supertokensId ?? '', { skip: !user });
  const [setRole, { isLoading: saving }] = useSetUserRoleMutation();
  const [revokeMutation] = useRevokeUserSessionsMutation();
  const [revoke, revoking] = useAction((id: string) => revokeMutation(id).unwrap(), {
    success: (r) => (r.revoked ? `Cerramos ${r.revoked} sesión${r.revoked === 1 ? '' : 'es'}` : 'No tenía sesiones abiertas'),
  });
  const [choice, setChoice] = useState<RoleChoice>(null);
  const [error, setError] = useState<string | null>(null);

  const current = detail ?? user;
  useEffect(() => {
    setChoice(current?.role ?? null);
    setError(null);
    // Solo al cambiar de usuario o cuando llega/actualiza su rol.
  }, [current?.supertokensId, current?.role]);

  if (!user) return <Sheet open={false} />;

  const name = current?.name || current?.email?.split('@')[0] || 'Sin nombre';
  const dirty = choice !== (current?.role ?? null);
  const googleOnly = !!detail && detail.loginMethods.length > 0 && !detail.loginMethods.includes('email');
  const allPermissions = Object.keys(PERMISSION_LABEL) as Permission[];
  const effective = new Set(roles?.find((r) => r.key === choice)?.permissions ?? []);

  const save = () => {
    const run = async () => {
      setError(null);
      try {
        await setRole({ supertokensId: user.supertokensId, role: choice }).unwrap();
      } catch (e) {
        setError(getErrorMessage(e));
        throw e;
      }
    };
    const giving = choice === 'ADMIN';
    const removing = !choice && !!current?.role;
    if (giving || removing) {
      confirm({
        title: giving ? 'Dar acceso de administrador' : 'Quitar acceso al panel',
        message: giving
          ? `${name} va a poder hacer todo, incluso gestionar usuarios y roles. ¿Seguro?`
          : `${name} deja de poder entrar al panel. Sus pedidos y su cuenta de cliente no cambian.`,
        confirmText: giving ? 'Hacer administrador' : 'Quitar acceso',
        variant: giving ? 'warning' : 'danger',
        onConfirm: run,
      });
    } else {
      run().catch(() => undefined); // el error queda en pantalla
    }
  };

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <UserAvatar user={current!} size="lg" />
            <div className="min-w-0">
              <SheetTitle className="truncate">{name}</SheetTitle>
              <SheetDescription className="truncate">{current?.email ?? 'Sin email'}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Rol actual</dt>
              <dd className="mt-1">
                <RoleBadge role={current?.role ?? null} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Alta</dt>
              <dd className="mt-1" title={formatDate(current?.createdAt)}>
                {formatRelative(current?.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ingresa con</dt>
              <dd className="mt-1">
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  detail?.loginMethods.map((m) => LOGIN_LABEL[m] ?? m).join(' · ') || '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Pedidos</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="tabular-nums">{current?.ordersCount ?? 0}</span>
                {detail?.lastOrder && (
                  <Link to={`/dashboard/orders/${detail.lastOrder.id}`} className="text-xs text-primary hover:underline">
                    último #{detail.lastOrder.id}
                  </Link>
                )}
                {detail?.lastOrder && <OrderStatusBadge status={detail.lastOrder.status as OrderStatus} />}
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Rol en el panel
            </h3>
            {isSelf ? (
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                No podés cambiar tu propio rol. Si hace falta, pedíselo a otro administrador.
              </p>
            ) : roles ? (
              <div className="space-y-3">
                <RolePicker roles={roles} value={choice} onChange={setChoice} disabled={saving} name="sheet-role" />
                {googleOnly && choice && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    Esta cuenta entra con Google y el panel pide email y contraseña. Para darle acceso, usá{' '}
                    <strong>Invitar al equipo</strong> con su email: se le crea una cuenta con contraseña para el panel.
                  </p>
                )}
                <FormError>{error}</FormError>
                <div className="flex justify-end gap-2">
                  {dirty && (
                    <Button variant="ghost" onClick={() => setChoice(current?.role ?? null)} disabled={saving}>
                      Descartar
                    </Button>
                  )}
                  <Button onClick={save} disabled={!dirty} loading={saving}>
                    Guardar rol
                  </Button>
                </div>
              </div>
            ) : (
              <Skeleton className="h-40" />
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">
              {dirty ? 'Permisos con el rol elegido' : 'Permisos'}
            </h3>
            <ul className="space-y-1.5 text-sm">
              {allPermissions.map((p) => {
                const has = effective.has(p);
                return (
                  <li key={p} className={has ? 'flex items-start gap-2' : 'flex items-start gap-2 text-muted-foreground/70'}>
                    {has ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Sí" />
                    ) : (
                      <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-label="No" />
                    )}
                    <span className={has ? '' : 'line-through decoration-muted-foreground/30'}>{PERMISSION_LABEL[p]}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {!isSelf && (
            <section className="border-t border-border pt-4">
              <h3 className="mb-1 text-sm font-semibold">Sesiones</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Cierra la sesión en todos sus dispositivos (tienda y panel). Útil si perdió el celular o dejó de trabajar con
                ustedes. Los cambios de rol aplican al instante, sin cerrar sesión.
              </p>
              <Button
                variant="outline"
                size="sm"
                loading={revoking}
                onClick={() =>
                  confirm({
                    title: 'Cerrar todas sus sesiones',
                    message: `${name} va a tener que volver a ingresar en todos sus dispositivos.`,
                    confirmText: 'Cerrar sesiones',
                    variant: 'warning',
                    onConfirm: () => revoke(user.supertokensId),
                  })
                }
              >
                {!revoking && <LogOut className="h-4 w-4" />}
                Cerrar sesiones
              </Button>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
