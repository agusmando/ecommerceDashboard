import { useState } from 'react';
import { ShieldCheck, UserPlus, Users as UsersIcon } from 'lucide-react';
import { useRoleCatalogQuery, useUsersQuery } from '../api/resources';
import type { ManagedUser, UserRoleFilter } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { FilterBar, SearchInput } from '../components/Filters';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { InviteUserModal } from '../components/users/InviteUserModal';
import { UserSheet } from '../components/users/UserSheet';
import { RoleBadge, UserAvatar } from '../components/users/UserBits';
import { useListFilters } from '../hooks/useListFilters';
import { useAppSelector } from '../store';
import { PERMISSION_LABEL, ROLE_LABEL, ROLE_TONE, type Permission } from '../lib/permissions';
import { cn, formatDate, formatNumber, formatRelative } from '../lib/utils';

const DEFAULTS = { search: '', role: 'ALL' as UserRoleFilter };

const FILTERS: { value: UserRoleFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'STAFF', label: 'Equipo' },
  { value: 'ADMIN', label: 'Administradores' },
  { value: 'EDITOR', label: 'Editores' },
  { value: 'EMPLOYEE', label: 'Empleados' },
  { value: 'CUSTOMER', label: 'Clientes' },
];

export default function Users() {
  const me = useAppSelector((s) => s.auth.user);
  const f = useListFilters('users', DEFAULTS, { textKeys: ['search'] });
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [inviting, setInviting] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useUsersQuery({
    search: f.debounced.search || undefined,
    role: f.debounced.role === 'ALL' ? undefined : f.debounced.role,
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });
  const counts = data?.counts ?? {};

  const columns: Column<ManagedUser>[] = [
    {
      key: 'user',
      header: 'Usuario',
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={u} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium">{u.name || u.email?.split('@')[0] || 'Sin nombre'}</span>
              {u.supertokensId === me?.supertokensId && <Badge>Vos</Badge>}
            </div>
            <div className="truncate text-xs text-muted-foreground">{u.email ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Rol', cell: (u) => <RoleBadge role={u.role} /> },
    {
      key: 'orders',
      header: 'Pedidos',
      align: 'right',
      hideOnMobile: true,
      cell: (u) => <span className="tabular-nums">{formatNumber(u.ordersCount)}</span>,
    },
    {
      key: 'created',
      header: 'Alta',
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-muted-foreground" title={formatDate(u.createdAt)}>
          {formatRelative(u.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Clientes registrados y equipo del panel. Asigná roles para dar acceso."
        actions={
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="w-4 h-4" />
            Invitar al equipo
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['ADMIN', 'EDITOR', 'EMPLOYEE', 'CUSTOMER'] as const).map((r) => {
          const active = f.values.role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => f.set({ role: active ? 'ALL' : r })}
              aria-pressed={active}
              className={cn(
                'rounded-xl border bg-card p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-accent/40',
              )}
            >
              <Badge tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}</Badge>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{isLoading ? '…' : formatNumber(counts[r] ?? 0)}</div>
            </button>
          );
        })}
      </div>

      <RoleMatrix open={showMatrix} onToggle={() => setShowMatrix((v) => !v)} />

      <DataTable
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <SearchInput value={f.values.search} onChange={(search) => f.set({ search })} placeholder="Buscar por nombre o email…" />
            <select
              aria-label="Filtrar por rol"
              value={f.values.role}
              onChange={(e) => f.set({ role: e.target.value as UserRoleFilter })}
              className="h-9 rounded-lg border border-border bg-input-background px-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {FILTERS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FilterBar>
        }
        columns={columns}
        rows={data?.content}
        rowKey={(u) => u.supertokensId}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        onRowClick={setSelected}
        empty={{
          icon: <UsersIcon className="w-6 h-6" />,
          title: 'No hay usuarios para mostrar',
          description: f.activeCount ? 'Probá con otra búsqueda o filtro.' : undefined,
        }}
        pagination={{
          info: data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      <UserSheet
        user={selected && (data?.content.find((u) => u.supertokensId === selected.supertokensId) ?? selected)}
        isSelf={selected?.supertokensId === me?.supertokensId}
        onClose={() => setSelected(null)}
      />
      <InviteUserModal isOpen={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

/** Tabla "qué puede hacer cada rol" (plegable). */
function RoleMatrix({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { data: roles } = useRoleCatalogQuery();
  const perms = Object.keys(PERMISSION_LABEL) as Permission[];
  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <CardTitle>¿Qué puede hacer cada rol?</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={open}>
          {open ? 'Ocultar' : 'Ver permisos'}
        </Button>
      </CardHeader>
      {open && roles && (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-1 py-2 font-medium">Permiso</th>
                {roles.map((r) => (
                  <th key={r.key} className="px-1 py-2 text-center font-medium">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {perms.map((p) => (
                <tr key={p}>
                  <td className="px-1 py-2">{PERMISSION_LABEL[p]}</td>
                  {roles.map((r) => (
                    <td key={r.key} className="px-1 py-2 text-center">
                      {r.permissions.includes(p) ? (
                        <span className="text-emerald-600" aria-label="Sí">
                          ✓
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50" aria-label="No">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 px-1 text-xs text-muted-foreground">
            Los clientes no tienen acceso al panel. Los cambios de rol aplican al instante.
          </p>
        </div>
      )}
    </Card>
  );
}
