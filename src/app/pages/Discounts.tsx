import { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Power, PowerOff, TicketPercent, Timer } from 'lucide-react';
import { discountCodesApi } from '../api/resources';
import type { DiscountCode } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { COUPON_STATE, COUPON_TYPE, couponState, dayToIso, describeCoupon, type CouponState } from '../lib/domain';
import { formatDate, formatNumber } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { StatTile } from '../components/StatTile';
import { DataTable, type Column } from '../components/DataTable';
import { ActiveFilter, DateFilter, FilterBar, SearchInput, Segmented } from '../components/Filters';
import { Badge, OfferStateBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { DiscountCodeFormModal } from '../components/discounts/DiscountCodeFormModal';

type StateFilter = 'all' | Exclude<CouponState, 'inactive'>;

const WEEK = 7 * 86400000;

function limits(dc: DiscountCode) {
  const parts: string[] = [];
  if (dc.minOrderAmount > 0) parts.push(`mín. ${formatNumber(dc.minOrderAmount)}`);
  if (dc.usageLimit != null) parts.push(`${dc.usedCount}/${dc.usageLimit} usos`);
  if (dc.perUserLimit != null) parts.push(`${dc.perUserLimit} por cliente`);
  return parts.length ? parts.join(' · ') : 'Sin límites';
}

function Validity({ dc }: { dc: DiscountCode }) {
  const start = new Date(dc.startTime).getTime();
  const end = new Date(dc.finishTime).getTime();
  const state = couponState(dc);
  const pct = Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(1, end - start)) * 100));
  return (
    <div className="min-w-40">
      <div className="text-sm whitespace-nowrap">
        {formatDate(dc.startTime)} – {formatDate(dc.finishTime)}
      </div>
      {state === 'active' && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted" title={`${Math.round(pct)} % transcurrido`}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Discounts() {
  const f = useListFilters('discounts', { active: '', code: '', from: '', to: '' }, { textKeys: ['code'] });
  const d = f.debounced;
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const q = discountCodesApi.usePage({
    active: d.active === '' ? '' : d.active === 'true',
    code: d.code as string,
    from: dayToIso(d.from as string),
    to: dayToIso(d.to as string, true),
    currentPage: d.page,
    amountPerPage: d.pageSize,
  });

  const [setActive] = discountCodesApi.useSetActive();
  const toggle = useActiveToggle(setActive, 'el código');

  const all = q.data?.content;
  const rows = useMemo(
    () => (stateFilter === 'all' ? all : all?.filter((dc) => couponState(dc) === stateFilter)),
    [all, stateFilter],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const list = all ?? [];
    return {
      active: list.filter((dc) => couponState(dc, now) === 'active').length,
      scheduled: list.filter((dc) => couponState(dc, now) === 'scheduled').length,
      expiring: list.filter((dc) => couponState(dc, now) === 'active' && new Date(dc.finishTime).getTime() - now <= WEEK).length,
    };
  }, [all]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (dc: DiscountCode) => {
    setEditing(dc);
    setFormOpen(true);
  };

  const columns: Column<DiscountCode>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: (dc) => (
        <div className="min-w-0">
          <div className="font-mono font-semibold">{dc.code}</div>
          {dc.description && <div className="text-xs text-muted-foreground truncate max-w-56">{dc.description}</div>}
        </div>
      ),
    },
    {
      key: 'benefit',
      header: 'Beneficio',
      cell: (dc) => (
        <div>
          <span className="font-medium">{describeCoupon(dc)}</span>
          <Badge tone="info" className="mt-1 ml-1">
            {COUPON_TYPE[dc.discountType]?.label ?? dc.discountType}
          </Badge>
        </div>
      ),
    },
    { key: 'validity', header: 'Vigencia', cell: (dc) => <Validity dc={dc} /> },
    {
      key: 'limits',
      header: 'Límites / usos',
      hideOnMobile: true,
      cell: (dc) => (
        <div className="text-sm">
          <div>{limits(dc)}</div>
          {dc.usageLimit != null && (
            <div className="text-xs text-muted-foreground tabular-nums">
              {dc.usedCount} canje{dc.usedCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      ),
    },
    { key: 'state', header: 'Estado', cell: (dc) => <OfferStateBadge state={couponState(dc)} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (dc) => (
        <RowActions
          actions={[
            { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onClick: () => openEdit(dc) },
            {
              label: dc.active ? 'Desactivar' : 'Activar',
              icon: dc.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
              danger: dc.active,
              separator: true,
              onClick: () => toggle(dc.id, `Código ${dc.code}`, dc.active),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Códigos de descuento"
        description="Cupones que el cliente escribe en el checkout (o en /ofertas). Descuentan sobre el subtotal de productos, sin envío."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo código
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Vigentes" value={stats.active} icon={<TicketPercent className="w-5 h-5" />} loading={q.isLoading} hint="En esta página" />
        <StatTile label="Programados" value={stats.scheduled} icon={<CalendarClock className="w-5 h-5" />} loading={q.isLoading} hint="Empiezan más adelante" />
        <StatTile label="Vencen en 7 días" value={stats.expiring} icon={<Timer className="w-5 h-5" />} loading={q.isLoading} hint="Vigentes por terminar" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(dc) => dc.id}
        loading={q.isLoading}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={openEdit}
        rowClassName={(dc) => (dc.active ? undefined : 'opacity-60')}
        empty={{
          title: f.activeCount || stateFilter !== 'all' ? 'Ningún código coincide con los filtros' : 'Todavía no hay códigos',
          description: 'Creá un código para que los clientes lo usen en el checkout.',
          action: !f.activeCount ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Nuevo código
            </Button>
          ) : undefined,
        }}
        pagination={{
          info: q.data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
        toolbar={
          <div className="space-y-3">
            <FilterBar
              activeCount={f.activeCount}
              onReset={() => {
                f.reset();
                setStateFilter('all');
              }}
            >
              <SearchInput value={f.values.code as string} onChange={(v) => f.set({ code: v })} placeholder="Código…" />
              <ActiveFilter value={f.values.active as '' | 'true' | 'false'} onChange={(v) => f.set({ active: v })} labels={['Todos', 'Activos', 'Inactivos']} />
              <DateFilter label="Desde" value={f.values.from as string} onChange={(v) => f.set({ from: v })} />
              <DateFilter label="Hasta" value={f.values.to as string} onChange={(v) => f.set({ to: v })} />
            </FilterBar>
            <Segmented<StateFilter>
              value={stateFilter}
              onChange={setStateFilter}
              options={[
                { value: 'all', label: 'Todos', count: all?.length },
                { value: 'active', label: 'Vigentes', count: stats.active },
                { value: 'scheduled', label: 'Programados', count: stats.scheduled },
                { value: 'expired', label: 'Vencidos', count: all?.filter((dc) => couponState(dc) === 'expired').length },
              ]}
            />
          </div>
        }
      />

      <DiscountCodeFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} coupon={editing} />
    </>
  );
}
