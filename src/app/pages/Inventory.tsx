import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Boxes, DollarSign, ExternalLink, PackageX, Pencil, Power, PowerOff, Settings2 } from 'lucide-react';
import { variantsApi } from '../api/resources';
import type { ProductVariant } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { useCan } from '../hooks/useCan';
import { formatQty, isMix, stockLevel } from '../lib/domain';
import { cn, formatCurrency, formatNumber } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { StatTile } from '../components/StatTile';
import { DataTable, type Column } from '../components/DataTable';
import { ActiveFilter, FilterBar, FilterSelect, SearchInput } from '../components/Filters';
import { ActiveBadge, Badge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { AffixInput } from '../components/Form';
import { Switch } from '../components/ui/switch';
import { variantLabel } from '../components/CatalogPickers';
import { VariantPrice } from '../components/VariantPrice';
import { useVariantModals } from '../components/products/VariantModals';

const DEFAULTS = {
  name: '',
  minPrice: '',
  maxPrice: '',
  maxStock: '',
  availableWeb: '' as '' | 'true' | 'false',
  active: 'true' as '' | 'true' | 'false',
  lowOnly: false,
};

const isLow = (v: ProductVariant) => v.currentStock <= 0 || (v.stockThreshold > 0 && v.currentStock <= v.stockThreshold);

function StockBar({ v }: { v: ProductVariant }) {
  const l = stockLevel(v);
  // La barra compara contra 2× el umbral (o el propio stock si no hay umbral).
  const ref = v.stockThreshold > 0 ? v.stockThreshold * 2 : Math.max(v.currentStock, 1);
  const pct = Math.max(0, Math.min(100, (v.currentStock / ref) * 100));
  const color = l.tone === 'danger' ? 'bg-red-500' : l.tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="min-w-28 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="tabular-nums">{formatQty(v.currentStock, v.contentMeasure)}</span>
        {l.tone !== 'success' && <Badge tone={l.tone}>{l.label}</Badge>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const f = useListFilters('inventory', DEFAULTS, { textKeys: ['name', 'minPrice', 'maxPrice', 'maxStock'] });
  const { values, debounced } = f;
  const modals = useVariantModals();
  const [setActive] = variantsApi.useSetActive();
  const toggle = useActiveToggle(setActive, 'la variante');
  const can = useCan();
  const canEdit = can('catalog.edit');
  // El stock se ajusta con PUT /product/variant/:id/stock (stock.manage).
  const canAdjustStock = can('stock.manage');

  const numOrEmpty = (v: string) => (v.trim() === '' ? '' : Number(v));

  const query = variantsApi.usePage({
    q: debounced.name,
    minPrice: numOrEmpty(debounced.minPrice),
    maxPrice: numOrEmpty(debounced.maxPrice),
    maxStock: numOrEmpty(debounced.maxStock),
    availableWeb: debounced.availableWeb === '' ? '' : debounced.availableWeb === 'true',
    active: debounced.active === '' ? '' : debounced.active === 'true',
    detalle: true,
    currentPage: debounced.page,
    amountPerPage: debounced.pageSize,
  });

  const pageRows = query.data?.content;
  const rows = useMemo(() => (values.lowOnly ? pageRows?.filter(isLow) : pageRows), [pageRows, values.lowOnly]);

  const stats = useMemo(() => {
    const list = pageRows ?? [];
    return {
      total: query.data?.pagination.totalAmount ?? 0,
      out: list.filter((v) => v.currentStock <= 0).length,
      low: list.filter((v) => v.currentStock > 0 && v.stockThreshold > 0 && v.currentStock <= v.stockThreshold).length,
    };
  }, [pageRows, query.data]);

  const columns: Column<ProductVariant>[] = [
    {
      key: 'name',
      header: 'Variante',
      cell: (v) => (
        <div className="min-w-0 max-w-xs">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{variantLabel(v)}</span>
            {isMix(v) && <Badge tone="violet">Mix</Badge>}
          </div>
          {v.product?.Category?.name && <div className="text-xs text-muted-foreground">{v.product.Category.name}</div>}
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Costo',
      align: 'right',
      hideOnMobile: true,
      cell: (v) => <span className="tabular-nums text-muted-foreground">{formatCurrency(v.price)}</span>,
    },
    {
      key: 'final',
      header: 'Precio',
      align: 'right',
      cell: (v) => <VariantPrice variant={v} />,
    },
    { key: 'stock', header: 'Stock', cell: (v) => <StockBar v={v} /> },
    {
      key: 'threshold',
      header: 'Umbral',
      align: 'right',
      hideOnMobile: true,
      cell: (v) => <span className="tabular-nums text-muted-foreground">{v.stockThreshold ? formatQty(v.stockThreshold, v.contentMeasure) : '—'}</span>,
    },
    {
      key: 'channels',
      header: 'Web',
      hideOnMobile: true,
      cell: (v) => <Badge tone={v.availableWeb ? 'info' : 'default'}>{v.availableWeb ? 'Visible' : 'Oculta'}</Badge>,
    },
    { key: 'active', header: 'Estado', hideOnMobile: true, cell: (v) => <ActiveBadge active={v.active} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (v) => (
        <RowActions
          actions={[
            { label: 'Editar variante', icon: <Pencil className="w-4 h-4" />, onClick: () => modals.show('edit', v), hidden: !canEdit },
            { label: 'Ajustar stock', icon: <Boxes className="w-4 h-4" />, onClick: () => modals.show('stock', v), hidden: !canAdjustStock },
            { label: 'Editar precio', icon: <DollarSign className="w-4 h-4" />, onClick: () => modals.show('price', v), hidden: !canEdit },
            { label: 'Disponibilidad', icon: <Settings2 className="w-4 h-4" />, onClick: () => modals.show('availability', v), hidden: !canEdit },
            {
              label: 'Ir al producto',
              icon: <ExternalLink className="w-4 h-4" />,
              onClick: () => navigate(`/dashboard/products/${v.productId}`),
            },
            {
              label: v.active ? 'Desactivar' : 'Activar',
              icon: v.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
              onClick: () => toggle(v.id, v.name, v.active),
              danger: v.active,
              separator: true,
              hidden: !canEdit,
            },
          ]}
        />
      ),
    },
  ];

  const toolbar = (
    <div className="space-y-2">
      <FilterBar activeCount={f.activeCount} onReset={f.reset}>
        <SearchInput value={values.name} onChange={(name) => f.set({ name })} placeholder="Buscar producto o variante…" />
        <div className="w-32">
          <AffixInput
            className="h-9"
            prefix="$"
            type="number"
            min={0}
            placeholder="Costo mín."
            value={values.minPrice}
            onChange={(e) => f.set({ minPrice: e.target.value })}
          />
        </div>
        <div className="w-32">
          <AffixInput
            className="h-9"
            prefix="$"
            type="number"
            min={0}
            placeholder="Costo máx."
            value={values.maxPrice}
            onChange={(e) => f.set({ maxPrice: e.target.value })}
          />
        </div>
        <div className="w-36">
          <AffixInput
            className="h-9"
            type="number"
            min={0}
            placeholder="Stock ≤"
            title="Stock menor o igual (g para productos por kg)"
            value={values.maxStock}
            onChange={(e) => f.set({ maxStock: e.target.value })}
          />
        </div>
        <FilterSelect
          value={values.availableWeb}
          onChange={(availableWeb) => f.set({ availableWeb })}
          placeholder="Web: todas"
          options={[
            { value: 'true', label: 'Disponibles en web' },
            { value: 'false', label: 'No disponibles en web' },
          ]}
        />
        <ActiveFilter value={values.active} onChange={(active) => f.set({ active })} />
      </FilterBar>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={values.lowOnly} onCheckedChange={(lowOnly) => f.set({ lowOnly })} />
        Solo stock bajo o sin stock <span className="text-xs">(filtra la página actual)</span>
      </label>
    </div>
  );

  return (
    <>
      <PageHeader title="Inventario" description="Stock, precios y disponibilidad de todas las variantes." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Variantes"
          value={formatNumber(stats.total)}
          hint="Con los filtros actuales"
          icon={<Boxes className="w-5 h-5" />}
          loading={query.isLoading}
        />
        <StatTile
          label="Sin stock"
          value={formatNumber(stats.out)}
          hint="En esta página"
          icon={<PackageX className="w-5 h-5" />}
          loading={query.isLoading}
        />
        <StatTile
          label="Stock bajo"
          value={formatNumber(stats.low)}
          hint="Bajo el umbral, en esta página"
          icon={<AlertTriangle className="w-5 h-5" />}
          loading={query.isLoading}
        />
      </div>

      <DataTable
        toolbar={toolbar}
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        loading={query.isLoading}
        fetching={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        rowClassName={(v) => (v.active ? undefined : 'opacity-60')}
        empty={{
          icon: <Boxes className="w-6 h-6" />,
          title: values.lowOnly ? 'No hay variantes con stock bajo en esta página' : 'No hay variantes',
          description: f.activeCount ? 'Probá con otros filtros.' : undefined,
        }}
        pagination={{
          info: query.data?.pagination,
          page: values.page,
          pageSize: values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      {modals.element}
    </>
  );
}
