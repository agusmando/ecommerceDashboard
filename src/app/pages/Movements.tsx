import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, Scale, X } from 'lucide-react';
import { movementsApi, variantsApi } from '../api/resources';
import { MOVEMENT_TYPES, type Id, type Movement, type MovementType } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { MOVEMENT_TYPE, formatQty } from '../lib/domain';
import { cn, formatCurrency, formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { StatTile } from '../components/StatTile';
import { DataTable, type Column } from '../components/DataTable';
import { DateFilter, FilterBar, FilterSelect } from '../components/Filters';
import { MovementTypeBadge } from '../components/Badge';
import { VariantPicker, variantLabel } from '../components/CatalogPickers';
import { MovementFormModal } from '../components/movements/MovementFormModal';

export default function Movements() {
  const f = useListFilters(
    'movements',
    { productVariantId: '' as Id | '', type: '' as MovementType | '', from: '', to: '', day: '' },
    { pageSize: 50 },
  );
  const v = f.values;
  const variantId = v.productVariantId ? Number(v.productVariantId) : null;
  const [formOpen, setFormOpen] = useState(false);

  const { data: variant } = variantsApi.useOne(variantId);

  const q = movementsApi.usePage({
    detalle: true,
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
    for (const m of rows ?? []) {
      if (m.quantity >= 0) inSum += m.quantity;
      else outSum += m.quantity;
    }
    return { inSum, outSum, net: inSum + outSum };
  }, [rows]);

  const qtyMeasure = (m: Movement) => m.productVariant?.contentMeasure ?? (m.productVariantId === variantId ? measure : undefined);

  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Fecha', cell: (m) => <span className="whitespace-nowrap">{formatDateTime(m.createdAt)}</span> },
    {
      key: 'variant',
      header: 'Variante',
      cell: (m) =>
        m.productVariant?.name ? (
          <span className="font-medium">{m.productVariant.name}</span>
        ) : (
          <span className="text-muted-foreground">Variante #{m.productVariantId}</span>
        ),
    },
    { key: 'type', header: 'Tipo', cell: (m) => <MovementTypeBadge type={m.type} /> },
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
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Registrar movimiento
          </Button>
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

      <MovementFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} defaultVariantId={variantId} />
    </>
  );
}
