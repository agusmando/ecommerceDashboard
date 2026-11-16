import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, LayoutGrid, List, Package, Plus, Power, PowerOff } from 'lucide-react';
import { productsApi } from '../api/resources';
import type { Product, ProductVariant } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { useCan } from '../hooks/useCan';
import { formatQty, priceUnit, stockLevel, type Tone } from '../lib/domain';
import { cn, formatCurrency } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { ActiveFilter, FilterBar, FilterSelect, SearchInput, Segmented } from '../components/Filters';
import { MultiSelect } from '../components/Pickers';
import { ActiveBadge, Badge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { Pagination } from '../components/Pagination';
import { useBrandOptions, useCategoryOptions, useTagOptions } from '../components/CatalogPickers';
import { OfferTag } from '../components/VariantPrice';
import { CreateProductModal } from '../components/products/CreateProductModal';
import { cld } from '../lib/cloudinary';

const DEFAULTS = {
  name: '',
  category: '',
  brand: '',
  tags: [] as string[],
  variants: '',
  active: '' as '' | 'true' | 'false',
  local: '' as '' | 'true' | 'false',
};

// ---------------------------------------------------------------- Resúmenes por producto

const TONE_RANK: Record<Tone, number> = { danger: 3, warning: 2, success: 1, info: 0, default: 0, violet: 0 };

export function productSummary(p: Product) {
  const variants = (p.variants ?? []).filter((v) => v.active);
  const prices = variants.map((v) => v.finalPrice ?? 0).filter((n) => n > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const stock = variants.reduce((s, v) => s + (v.currentStock || 0), 0);
  const worst = variants.reduce<ReturnType<typeof stockLevel> | null>((acc, v) => {
    const l = stockLevel(v);
    return !acc || TONE_RANK[l.tone] > TONE_RANK[acc.tone] ? l : acc;
  }, null);
  const measure = variants[0]?.contentMeasure ?? p.measure;
  return { variants, min, max, stock, worst, measure };
}

function PriceRange({ p }: { p: Product }) {
  const { min, max, measure, variants } = productSummary(p);
  const offers = Array.from(new Set(variants.map((v) => v.activeOffer?.label).filter(Boolean)));
  const offer = offers.length === 1 ? offers[0]! : offers.length > 1 ? 'Ofertas' : null;
  if (!min) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {formatCurrency(min)}
      {max !== min && <> – {formatCurrency(max)}</>}
      <span className="text-xs text-muted-foreground">{priceUnit(measure)}</span>
      {offer && <OfferTag label={offer} className="ml-1.5" />}
    </span>
  );
}

function StockCell({ p }: { p: Product }) {
  const { stock, worst, measure, variants } = productSummary(p);
  if (!variants.length) return <span className="text-xs text-muted-foreground">Sin variantes activas</span>;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="tabular-nums">{formatQty(stock, measure)}</span>
      {worst && worst.tone !== 'success' && <Badge tone={worst.tone}>{worst.label}</Badge>}
    </div>
  );
}

function TagChips({ p, max = 3 }: { p: Product; max?: number }) {
  const tags = p.Tags ?? [];
  if (!tags.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => (
        <span key={t.id} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
          {t.name}
        </span>
      ))}
      {tags.length > max && <span className="text-xs text-muted-foreground">+{tags.length - max}</span>}
    </div>
  );
}

function firstImage(p: Product): string | undefined {
  return (p.variants ?? []).flatMap((v: ProductVariant) => v.images ?? [])[0]?.secure_url;
}

// ---------------------------------------------------------------- Página

export default function Products() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<'table' | 'grid'>('table');

  const f = useListFilters('products', DEFAULTS, { textKeys: ['name', 'variants'] });
  const { values, debounced } = f;

  const query = productsApi.usePage({
    q: debounced.name,
    category: debounced.category,
    brand: debounced.brand,
    tags: debounced.tags,
    variants: debounced.variants,
    active: debounced.active === '' ? '' : debounced.active === 'true',
    isLocal: debounced.local === '' ? '' : debounced.local === 'true',
    detalle: true,
    currentPage: debounced.page,
    amountPerPage: debounced.pageSize,
  });

  const [setActive] = productsApi.useSetActive();
  const toggle = useActiveToggle(setActive, 'el producto');
  const can = useCan();
  const canCreate = can('catalog.edit');

  const categories = useCategoryOptions();
  const brands = useBrandOptions();
  const tags = useTagOptions();
  const byName = (rows?: { name: string }[]) =>
    (rows ?? []).map((r) => ({ value: r.name, label: r.name })).sort((a, b) => a.label.localeCompare(b.label));
  const categoryOptions = useMemo(() => byName(categories.rows), [categories.rows]);
  const brandOptions = useMemo(() => byName(brands.rows), [brands.rows]);
  const tagOptions = useMemo(() => byName(tags.rows), [tags.rows]);

  const rows = query.data?.content;
  const open = (p: Product) => navigate(`/dashboard/products/${p.id}`);

  const actionsFor = (p: Product) => [
    { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => open(p) },
    {
      label: p.active ? 'Desactivar' : 'Activar',
      icon: p.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
      onClick: () => toggle(p.id, p.name, p.active),
      danger: p.active,
      separator: true,
      hidden: !can('catalog.delete'),
    },
  ];

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Producto',
      cell: (p) => (
        <div className="min-w-0 max-w-xs">
          <div className="font-medium text-foreground truncate">{p.name}</div>
          {p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
        </div>
      ),
    },
    { key: 'category', header: 'Categoría', hideOnMobile: true, cell: (p) => p.Category?.name ?? '—' },
    {
      key: 'brand',
      header: 'Marca',
      hideOnMobile: true,
      cell: (p) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {p.Brand?.name ?? '—'}
          {p.isLocal ? (
            <Badge tone="success">Local</Badge>
          ) : (
            p.variants?.some((v) => v.isLocal) && <Badge tone="success" title="Algunas variantes son de productor local">Local (algunas)</Badge>
          )}
        </span>
      ),
    },
    { key: 'tags', header: 'Etiquetas', hideOnMobile: true, cell: (p) => <TagChips p={p} /> },
    {
      key: 'variants',
      header: 'Variantes',
      align: 'center',
      cell: (p) => <span className="tabular-nums">{p.variants?.length ?? 0}</span>,
    },
    { key: 'price', header: 'Precio', cell: (p) => <PriceRange p={p} /> },
    { key: 'stock', header: 'Stock', cell: (p) => <StockCell p={p} /> },
    { key: 'active', header: 'Estado', cell: (p) => <ActiveBadge active={p.active} /> },
    { key: 'actions', header: '', align: 'right', cell: (p) => <RowActions actions={actionsFor(p)} /> },
  ];

  const pagination = {
    info: query.data?.pagination,
    page: values.page,
    pageSize: values.pageSize,
    onPageChange: f.setPage,
    onPageSizeChange: f.setPageSize,
  };

  const toolbar = (
    <FilterBar
      activeCount={f.activeCount}
      onReset={f.reset}
      right={
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: <List className="w-4 h-4" aria-label="Tabla" /> },
            { value: 'grid', label: <LayoutGrid className="w-4 h-4" aria-label="Tarjetas" /> },
          ]}
        />
      }
    >
      <SearchInput value={values.name} onChange={(name) => f.set({ name })} placeholder="Buscar producto, marca, etiqueta…" />
      <FilterSelect value={values.category} onChange={(category) => f.set({ category })} options={categoryOptions} placeholder="Todas las categorías" />
      <FilterSelect value={values.brand} onChange={(brand) => f.set({ brand })} options={brandOptions} placeholder="Todas las marcas" />
      <FilterSelect
        value={values.local}
        onChange={(local) => f.set({ local: local as '' | 'true' | 'false' })}
        options={[
          { value: 'true', label: 'Productor local' },
          { value: 'false', label: 'De marca' },
        ]}
        placeholder="Local y de marca"
      />
      <MultiSelect
        className="h-9 min-h-9 w-full sm:w-56 py-1"
        value={values.tags}
        onChange={(t) => f.set({ tags: t as string[] })}
        options={tagOptions}
        placeholder="Etiquetas"
        searchPlaceholder="Buscar etiqueta…"
      />
      <SearchInput className="sm:w-48" value={values.variants} onChange={(variants) => f.set({ variants })} placeholder="Variante…" />
      <ActiveFilter value={values.active} onChange={(active) => f.set({ active })} />
    </FilterBar>
  );

  const empty = {
    icon: <Package className="w-6 h-6" />,
    title: f.activeCount ? 'Ningún producto coincide con los filtros' : 'Todavía no hay productos',
    description: f.activeCount ? 'Probá con otros filtros.' : canCreate ? 'Creá el primero para empezar a vender.' : undefined,
    action: f.activeCount ? (
      <Button variant="outline" size="sm" onClick={f.reset}>
        Limpiar filtros
      </Button>
    ) : canCreate ? (
      <Button size="sm" onClick={() => setCreating(true)}>
        <Plus className="w-4 h-4" /> Nuevo producto
      </Button>
    ) : undefined,
  };

  return (
    <>
      <PageHeader
        title="Productos"
        description={
          query.data ? `${query.data.pagination.totalAmount} productos en el catálogo` : 'Catálogo de productos y sus variantes'
        }
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Nuevo producto
            </Button>
          )
        }
      />

      {view === 'table' ? (
        <DataTable
          toolbar={toolbar}
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          loading={query.isLoading}
          fetching={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={open}
          rowClassName={(p) => (p.active ? undefined : 'opacity-60')}
          empty={empty}
          pagination={pagination}
        />
      ) : (
        <div className="space-y-4">
          <Card className="p-3 sm:p-4">{toolbar}</Card>
          {query.isLoading && !rows ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : query.error && !rows ? (
            <Card>
              <ErrorState error={query.error} onRetry={query.refetch} />
            </Card>
          ) : !rows?.length ? (
            <Card>
              <EmptyState {...empty} />
            </Card>
          ) : (
            <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity', query.isFetching && 'opacity-60')}>
              {rows.map((p) => {
                const img = firstImage(p);
                return (
                  <Card
                    key={p.id}
                    className={cn('group cursor-pointer overflow-hidden p-0 sm:p-0 transition-shadow hover:shadow-md', !p.active && 'opacity-60')}
                  >
                    <div onClick={() => open(p)}>
                      <div className="flex h-36 items-center justify-center bg-muted/50">
                        {img ? (
                          <img src={cld(img, { w: 480, h: 288 })} alt={p.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="w-10 h-10 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{p.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {[p.Category?.name, p.Brand?.name].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </div>
                          <RowActions actions={actionsFor(p)} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <PriceRange p={p} />
                          <StockCell p={p} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <TagChips p={p} max={2} />
                          <ActiveBadge active={p.active} />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {!!rows?.length && (
            <Card className="p-0 sm:p-0">
              <Pagination {...pagination} pagination={pagination.info} disabled={query.isFetching} />
            </Card>
          )}
        </div>
      )}

      {canCreate && <CreateProductModal isOpen={creating} onClose={() => setCreating(false)} />}
    </>
  );
}
