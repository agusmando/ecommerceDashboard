import { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Power, PowerOff, TicketPercent, Timer } from 'lucide-react';
import { offersApi } from '../api/resources';
import type { Offer } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { DISCOUNT_TYPE, dayToIso, describeOffer, offerState, type OfferState } from '../lib/domain';
import { formatDate, formatNumber } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { StatTile } from '../components/StatTile';
import { DataTable, type Column } from '../components/DataTable';
import { ActiveFilter, DateFilter, FilterBar, SearchInput, Segmented } from '../components/Filters';
import { Badge, OfferStateBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { variantLabel } from '../components/CatalogPickers';
import { OfferFormModal } from '../components/offers/OfferFormModal';

type StateFilter = 'all' | Exclude<OfferState, 'inactive'>;

const WEEK = 7 * 86400000;

function offerTarget(o: Offer) {
  if (o.ProductVariant) return { kind: 'Variante', name: variantLabel(o.ProductVariant) };
  if (o.Product) return { kind: 'Producto', name: o.Product.name };
  if (o.productVariantId) return { kind: 'Variante', name: `Variante #${o.productVariantId}` };
  return { kind: 'Producto', name: `Producto #${o.productId}` };
}

function Validity({ o }: { o: Offer }) {
  const start = new Date(o.startTime).getTime();
  const end = new Date(o.finishTime).getTime();
  const state = offerState(o);
  const pct = Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(1, end - start)) * 100));
  return (
    <div className="min-w-40">
      <div className="text-sm whitespace-nowrap">
        {formatDate(o.startTime)} – {formatDate(o.finishTime)}
      </div>
      {state === 'active' && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted" title={`${Math.round(pct)} % transcurrido`}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Offers() {
  const f = useListFilters('offers', { active: '', product: '', variants: '', from: '', to: '' }, { textKeys: ['product', 'variants'] });
  const d = f.debounced;
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [editing, setEditing] = useState<Offer | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const q = offersApi.usePage({
    detalle: true,
    active: d.active === '' ? '' : d.active === 'true',
    product: d.product as string,
    variants: d.variants as string,
    from: dayToIso(d.from as string),
    to: dayToIso(d.to as string, true),
    currentPage: d.page,
    amountPerPage: d.pageSize,
  });

  const [setActive] = offersApi.useSetActive();
  const toggle = useActiveToggle(setActive, 'la oferta');

  const all = q.data?.content;
  const rows = useMemo(
    () => (stateFilter === 'all' ? all : all?.filter((o) => offerState(o) === stateFilter)),
    [all, stateFilter],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const list = all ?? [];
    return {
      active: list.filter((o) => offerState(o, now) === 'active').length,
      scheduled: list.filter((o) => offerState(o, now) === 'scheduled').length,
      expiring: list.filter((o) => offerState(o, now) === 'active' && new Date(o.finishTime).getTime() - now <= WEEK).length,
    };
  }, [all]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (o: Offer) => {
    setEditing(o);
    setFormOpen(true);
  };

  const columns: Column<Offer>[] = [
    {
      key: 'target',
      header: 'Aplica a',
      cell: (o) => {
        const t = offerTarget(o);
        return (
          <div className="min-w-0">
            <div className="font-medium truncate max-w-64">{t.name}</div>
            <Badge tone={t.kind === 'Variante' ? 'info' : 'violet'} className="mt-1">
              {t.kind}
            </Badge>
          </div>
        );
      },
    },
    { key: 'type', header: 'Tipo', hideOnMobile: true, cell: (o) => <span className="text-muted-foreground">{DISCOUNT_TYPE[o.discountType]?.short ?? o.discountType}</span> },
    {
      key: 'benefit',
      header: 'Beneficio',
      cell: (o) => <span className="font-medium">{describeOffer(o, o.ProductVariant?.contentMeasure ?? o.Product?.measure)}</span>,
    },
    { key: 'validity', header: 'Vigencia', cell: (o) => <Validity o={o} /> },
    {
      key: 'threshold',
      header: 'Stock mín.',
      align: 'right',
      hideOnMobile: true,
      cell: (o) => (o.stockThreshold ? <span className="tabular-nums">{formatNumber(o.stockThreshold)}</span> : <span className="text-muted-foreground">—</span>),
    },
    { key: 'state', header: 'Estado', cell: (o) => <OfferStateBadge state={offerState(o)} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (o) => (
        <RowActions
          actions={[
            { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onClick: () => openEdit(o) },
            {
              label: o.active ? 'Desactivar' : 'Activar',
              icon: o.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
              danger: o.active,
              separator: true,
              onClick: () => toggle(o.id, `Oferta #${o.id}`, o.active),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ofertas"
        description="Descuentos por variante o producto. Las vencidas, inactivas o por debajo del stock mínimo no se aplican."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nueva oferta
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Vigentes" value={stats.active} icon={<TicketPercent className="w-5 h-5" />} loading={q.isLoading} hint="En esta página" />
        <StatTile label="Programadas" value={stats.scheduled} icon={<CalendarClock className="w-5 h-5" />} loading={q.isLoading} hint="Empiezan más adelante" />
        <StatTile label="Vencen en 7 días" value={stats.expiring} icon={<Timer className="w-5 h-5" />} loading={q.isLoading} hint="Vigentes por terminar" />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(o) => o.id}
        loading={q.isLoading}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={openEdit}
        rowClassName={(o) => (o.active ? undefined : 'opacity-60')}
        empty={{
          title: f.activeCount || stateFilter !== 'all' ? 'Ninguna oferta coincide con los filtros' : 'Todavía no hay ofertas',
          description: 'Creá una oferta para una variante o un producto.',
          action: !f.activeCount ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Nueva oferta
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
              <SearchInput value={f.values.product as string} onChange={(v) => f.set({ product: v })} placeholder="Producto…" />
              <SearchInput value={f.values.variants as string} onChange={(v) => f.set({ variants: v })} placeholder="Variante…" />
              <ActiveFilter value={f.values.active as '' | 'true' | 'false'} onChange={(v) => f.set({ active: v })} labels={['Todas', 'Activas', 'Inactivas']} />
              <DateFilter label="Desde" value={f.values.from as string} onChange={(v) => f.set({ from: v })} />
              <DateFilter label="Hasta" value={f.values.to as string} onChange={(v) => f.set({ to: v })} />
            </FilterBar>
            <Segmented<StateFilter>
              value={stateFilter}
              onChange={setStateFilter}
              options={[
                { value: 'all', label: 'Todas', count: all?.length },
                { value: 'active', label: 'Vigentes', count: stats.active },
                { value: 'scheduled', label: 'Programadas', count: stats.scheduled },
                { value: 'expired', label: 'Vencidas', count: all?.filter((o) => offerState(o) === 'expired').length },
              ]}
            />
          </div>
        }
      />

      <OfferFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} offer={editing} />
    </>
  );
}
