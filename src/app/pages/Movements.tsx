import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, ListPlus, Plus, Scale, X } from 'lucide-react';
import { movementsApi, variantsApi } from '../api/resources';
import { MOVEMENT_TYPES, type Id, type Movement, type MovementType } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { useCan } from '../hooks/useCan';
import { MOVEMENT_TYPE, formatQty } from '../lib/domain';
import { cn, formatCurrency, formatDateTime } from '../lib/utils';
import { downloadCsv, csvFilename, toCsv } from '../lib/csv';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { StatTile } from '../components/StatTile';
import { DataTable, type Column } from '../components/DataTable';
import { DateFilter, FilterBar, FilterSelect, SearchInput } from '../components/Filters';
import { MovementTypeBadge } from '../components/Badge';
import { VariantPicker, variantLabel } from '../components/CatalogPickers';
import { MovementFormModal } from '../components/movements/MovementFormModal';
import { BulkMovementModal } from '../components/movements/BulkMovementModal';

export default function Movements() {
  const f = useListFilters(
    'movements',
    { search: '', productVariantId: '' as Id | '', type: '' as MovementType | '', from: '', to: '', day: '' },
    { pageSize: 50, textKeys: ['search'] },
  );
  const v = f.values;
  const variantId = v.productVariantId ? Number(v.productVariantId) : null;
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const canRegister = useCan()('stock.manage');

  const { data: variant } = variantsApi.useOne(variantId);

  const q = movementsApi.usePage({
    detalle: true,
    search: f.debounced.search,
    productVariantId: variantId ?? '',
    type: v.type,
    // `day` (un día puntual) tiene prioridad sobre el rango.
    from: v.day ? '' : v.from,
    to: v.day ? '' : v.to,
    day: v.day,
    currentPage: v.page,
    amountPerPage: v.pageSize,
  });

  const rows = q.data?.content;
  const measure = variant?.contentMeasure;

  const totals = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    const byType = new Map<MovementType, { count: number; qty: number }>();
    for (const m of rows ?? []) {
      if (m.quantity >= 0) inSum += m.quantity;
      else outSum += m.quantity;
      const agg = byType.get(m.type) ?? { count: 0, qty: 0 };
      agg.count += 1;
      agg.qty += m.quantity;
      byType.set(m.type, agg);
    }
    return { inSum, outSum, net: inSum + outSum, byType };
  }, [rows]);

  const qtyMeasure = (m: Movement) => m.productVariant?.contentMeasure ?? (m.productVariantId === variantId ? measure : undefined);

  const movementsCsv = (list: Movement[]) =>
    toCsv(
      ['Fecha', 'ID', 'Producto', 'Variante', 'Tipo', 'Cantidad', 'Unidad', 'Costo', 'Nota'],
      list.map((m) => {
        const pv = m.productVariant;
        const m2 = qtyMeasure(m);
        return [
          m.createdAt,
          m.id,
          pv?.product?.name ?? pv?.name ?? `#${m.productVariantId}`,
          pv?.name && pv.name !== pv.product?.name && pv.name !== 'default' ? pv.name : '',
          MOVEMENT_TYPE[m.type]?.label ?? m.type,
          m.quantity,
          m2 ?? '',
          m.priceAtTime ?? '',
          m.note ?? '',
        ];
      }),
    );

  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Fecha', cell: (m) => <span className="whitespace-nowrap">{formatDateTime(m.createdAt)}</span> },
    {
      key: 'variant',
      header: 'Producto',
      cell: (m) => {
        const pv = m.productVariant;
        if (!pv) return <span className="text-muted-foreground">Variante #{m.productVariantId}</span>;
        const product = pv.product?.name;
        const showVariant = pv.name && pv.name !== product && pv.name !== 'default';
        return (
          <div className="min-w-0">
            <div className="truncate font-medium">{product ?? pv.name}</div>
            {product && showVariant && <div className="truncate text-xs text-muted-foreground">{pv.name}</div>}
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (m) => (
        <div className="min-w-0">
          <MovementTypeBadge type={m.type} />
          {m.note && <div className="mt-1 max-w-56 truncate text-xs text-muted-foreground" title={m.note}>{m.note}</div>}
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Cantidad',
      align: 'right',
      cell: (m) => (
        <span
          className={cn(
            'font-medium tabular-nums whitespace-nowrap',
            m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : m.quantity < 0 ? 'text-red-600 dark:text-red-400' : '',
          )}
        >
          {m.quantity > 0 ? '+' : m.quantity < 0 ? '−' : ''}
          {formatQty(Math.abs(m.quantity), qtyMeasure(m))}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Costo al momento',
      align: 'right',
      hideOnMobile: true,
      cell: (m) =>
        m.priceAtTime ? <span className="tabular-nums">{formatCurrency(m.priceAtTime)}</span> : <span className="text-muted-foreground">—</span>,
    },
    { key: 'id', header: 'ID', align: 'right', hideOnMobile: true, cell: (m) => <span className="text-muted-foreground tabular-nums">#{m.id}</span> },
  ];

  const totalHint = variantId ? 'En esta página' : 'Mezcla variantes: filtrá por una para que sea significativo';

  return (
    <>
      <PageHeader
        title="Movimientos de stock"
        description="Historial de ingresos, salidas, ajustes, devoluciones y producción de mixes. Más recientes primero."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => rows?.length && downloadCsv(csvFilename('movimientos'), movementsCsv(rows))}
              disabled={!rows?.length}
              title="Descarga los movimientos de la página actual (con los filtros aplicados)"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            {canRegister && (
              <>
                <Button variant="outline" onClick={() => setBulkOpen(true)}>
                  <ListPlus className="w-4 h-4" />
                  Carga masiva
                </Button>
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Registrar movimiento
                </Button>
              </>
            )}
          </div>
        }
      />

      {variantId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Mostrando la variante</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {variant ? variantLabel(variant) : `#${variantId}`}
            <button type="button" aria-label="Quitar filtro de variante" onClick={() => f.set({ productVariantId: '' })}>
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          {variant && <span className="text-muted-foreground">· stock actual {formatQty(variant.currentStock, variant.contentMeasure)}</span>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Entradas" value={`+${formatQty(totals.inSum, measure)}`} icon={<ArrowUpRight className="w-5 h-5" />} loading={q.isLoading} hint={totalHint} />
        <StatTile label="Salidas" value={`−${formatQty(Math.abs(totals.outSum), measure)}`} icon={<ArrowDownRight className="w-5 h-5" />} loading={q.isLoading} hint={totalHint} />
        <StatTile
          label="Neto"
          value={`${totals.net >= 0 ? '+' : '−'}${formatQty(Math.abs(totals.net), measure)}`}
          icon={<Scale className="w-5 h-5" />}
          loading={q.isLoading}
          hint={totalHint}
        />
      </div>

      {totals.byType.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">En esta página:</span>
          {[...totals.byType.entries()].map(([type, agg]) => (
            <button
              key={type}
              type="button"
              onClick={() => f.set({ type })}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors',
                v.type === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
              )}
              title={`${agg.count} ${agg.count === 1 ? 'movimiento' : 'movimientos'} · click para filtrar`}
            >
              <span className="font-medium">{MOVEMENT_TYPE[type].label}</span>
              <span className="tabular-nums text-muted-foreground">
                {agg.count} · {agg.qty >= 0 ? '+' : '−'}
                {formatQty(Math.abs(agg.qty), measure)}
              </span>
            </button>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        loading={q.isLoading}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        empty={{
          title: f.activeCount ? 'Ningún movimiento coincide con los filtros' : 'Todavía no hay movimientos',
          description: 'Los movimientos se generan al cargar stock, vender, devolver o producir mixes.',
        }}
        pagination={{
          info: q.data?.pagination,
          page: v.page,
          pageSize: v.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <SearchInput value={v.search} onChange={(search) => f.set({ search })} placeholder="Buscar producto o variante…" />
            <div className="w-full sm:w-72">
              <VariantPicker
                value={variantId}
                selectedLabel={variant ? variantLabel(variant) : variantId ? `#${variantId}` : undefined}
                onChange={(id) => f.set({ productVariantId: id ?? '' })}
                placeholder="Todas las variantes"
                onlyActive={false}
              />
            </div>
            <FilterSelect<MovementType>
              value={v.type}
              onChange={(t) => f.set({ type: t })}
              placeholder="Todos los tipos"
              options={MOVEMENT_TYPES.map((t) => ({ value: t, label: MOVEMENT_TYPE[t].label }))}
            />
            <DateFilter label="Día" value={v.day} onChange={(d) => f.set({ day: d })} />
            {!v.day && (
              <>
                <DateFilter label="Desde" value={v.from} onChange={(d) => f.set({ from: d })} />
                <DateFilter label="Hasta" value={v.to} onChange={(d) => f.set({ to: d })} />
              </>
            )}
          </FilterBar>
        }
      />

      {canRegister && (
        <>
          <MovementFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} defaultVariantId={variantId} />
          <BulkMovementModal isOpen={bulkOpen} onClose={() => setBulkOpen(false)} />
        </>
      )}
    </>
  );
}
