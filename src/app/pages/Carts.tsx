import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingBasket } from 'lucide-react';
import { cartsApi } from '../api/resources';
import type { Cart, CartItem } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { FilterBar, Segmented } from '../components/Filters';
import { Badge } from '../components/Badge';
import { StatTile } from '../components/StatTile';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { useListFilters } from '../hooks/useListFilters';
import { computeFinalPrice, formatPack, formatQty } from '../lib/domain';
import { OfferTag } from '../components/VariantPrice';
import { cn, formatCurrency, formatDateTime, formatNumber, formatRelative } from '../lib/utils';

const DEFAULTS = { content: 'all' as 'all' | 'items' | 'empty', sort: 'recent' as 'recent' | 'oldest' | 'value' };

/** Presentación efectiva: 0 = suelto, salvo que la variante tenga presentaciones (se usa la más chica). */
function bulkOf(it: CartItem) {
  if (it.selectedBulkOption > 0) return it.selectedBulkOption;
  const packs = (it.productVariant?.packagingOptions ?? []).filter((n) => n > 0).sort((a, b) => a - b);
  return packs[0] ?? 0;
}

function lineUnits(it: CartItem) {
  const b = bulkOf(it);
  return b ? it.quantity * b : it.quantity;
}

function lineValue(it: CartItem) {
  if (it.quote) return it.quote.total; // cotización del backend: ofertas aplicadas
  const v = it.productVariant;
  if (!v) return 0;
  const price = v.finalPrice ?? computeFinalPrice(v.price ?? 0, v.profitMargin ?? 0, v.roundingOption ?? 10);
  const units = lineUnits(it);
  return price * (v.contentMeasure === 'KG' ? units / 1000 : units);
}

const cartValue = (c: Cart) => c.summary?.total ?? (c.items ?? []).reduce((acc, it) => acc + lineValue(it), 0);

function owner(c: Cart) {
  if (c.userSuperTokensId) {
    const label = c.user?.email || c.user?.name || c.userSuperTokensId.slice(0, 12) + '…';
    return { label, name: c.user?.email ? c.user?.name : null, guest: false };
  }
  return { label: c.sessionId ? `Invitado · ${c.sessionId.slice(0, 8)}` : 'Invitado', name: null, guest: true };
}

export default function Carts() {
  const f = useListFilters('carts', DEFAULTS);
  const [selected, setSelected] = useState<Cart | null>(null);

  const { data, isLoading, isFetching, error, refetch } = cartsApi.usePage({
    detalle: true,
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });

  const all = data?.content;
  const rows = useMemo(() => {
    if (!all) return undefined;
    const filtered = all.filter((c) =>
      f.values.content === 'items' ? (c.items?.length ?? 0) > 0 : f.values.content === 'empty' ? !c.items?.length : true,
    );
    return filtered.slice().sort((a, b) => {
      if (f.values.sort === 'value') return cartValue(b) - cartValue(a);
      const d = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return f.values.sort === 'oldest' ? -d : d;
    });
  }, [all, f.values.content, f.values.sort]);

  const withItems = all?.filter((c) => c.items?.length) ?? [];
  const pageValue = withItems.reduce((acc, c) => acc + cartValue(c), 0);

  const columns: Column<Cart>[] = [
    { key: 'id', header: 'Carrito', cell: (c) => <span className="font-medium tabular-nums">#{c.id}</span> },
    {
      key: 'owner',
      header: 'Dueño',
      cell: (c) => {
        const o = owner(c);
        return o.guest ? (
          <Badge tone="default">{o.label}</Badge>
        ) : (
          <div className="min-w-0" title={c.userSuperTokensId ?? ''}>
            <div className="truncate font-medium">{o.label}</div>
            {o.name?.trim() && <div className="truncate text-xs text-muted-foreground">{o.name}</div>}
          </div>
        );
      },
    },
    { key: 'items', header: 'Líneas', align: 'right', cell: (c) => <span className="tabular-nums">{c.items?.length ?? 0}</span> },
    {
      key: 'value',
      header: 'Valor estimado',
      align: 'right',
      cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(cartValue(c))}</span>,
    },
    {
      key: 'updated',
      header: 'Última actividad',
      hideOnMobile: true,
      cell: (c) => (
        <span className="text-muted-foreground" title={formatDateTime(c.updatedAt)}>
          {formatRelative(c.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Carritos" description="Carritos abiertos de clientes e invitados (solo lectura)." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Carritos (página)" value={formatNumber(all?.length)} loading={isLoading} />
        <StatTile label="Con productos" value={formatNumber(withItems.length)} loading={isLoading} />
        <StatTile label="Valor potencial" value={formatCurrency(pageValue)} hint="Con ofertas aplicadas" loading={isLoading} />
      </div>

      <DataTable
        toolbar={
          <FilterBar
            activeCount={f.activeCount}
            onReset={f.reset}
            right={
              <select
                aria-label="Ordenar"
                value={f.values.sort}
                onChange={(e) => f.set({ sort: e.target.value as typeof DEFAULTS.sort })}
                className="h-9 rounded-lg border border-border bg-input-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="value">Mayor valor</option>
              </select>
            }
          >
            <Segmented
              value={f.values.content}
              onChange={(content) => f.set({ content })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'items', label: 'Con ítems' },
                { value: 'empty', label: 'Vacíos' },
              ]}
            />
          </FilterBar>
        }
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={isLoading}
        fetching={isFetching}
        error={error}
        onRetry={refetch}
        onRowClick={setSelected}
        empty={{ icon: <ShoppingBasket className="w-6 h-6" />, title: 'No hay carritos para mostrar' }}
        pagination={{
          info: data?.pagination,
          page: f.values.page,
          pageSize: f.values.pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Carrito #{selected.id}</SheetTitle>
                <SheetDescription>
                  {owner(selected).guest ? 'Invitado' : owner(selected).label} · actualizado{' '}
                  {formatRelative(selected.updatedAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-2 px-4 pb-6">
                {!selected.items?.length && <p className="text-sm text-muted-foreground">El carrito está vacío.</p>}
                {selected.items?.map((it) => {
                  const v = it.productVariant;
                  const b = bulkOf(it);
                  const enough = (v?.currentStock ?? 0) >= lineUnits(it);
                  return (
                    <div key={`${it.productVariantId}-${it.selectedBulkOption}`} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{v?.name ?? `Variante ${it.productVariantId}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {b
                              ? `${formatNumber(it.quantity)} × ${formatPack(b, v?.contentMeasure)}`
                              : formatQty(it.quantity, v?.contentMeasure)}
                          </div>
                        </div>
                        <div className="text-right text-sm tabular-nums">
                          {!!it.quote?.discount && (
                            <div className="text-xs text-muted-foreground line-through">{formatCurrency(it.quote.total + it.quote.discount)}</div>
                          )}
                          <div className={cn('font-medium', !!it.quote?.discount && 'text-emerald-700 dark:text-emerald-400')}>
                            {formatCurrency(lineValue(it))}
                          </div>
                          {!!it.quote?.discount && it.quote.offerType && <OfferTag label={it.quote.offerType} />}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        {enough ? (
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Stock suficiente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Stock {formatQty(v?.currentStock, v?.contentMeasure)}
                          </span>
                        )}
                        {v && !v.active && <Badge tone="danger">Variante inactiva</Badge>}
                      </div>
                    </div>
                  );
                })}
                {!!selected.summary?.discount && (
                  <div className="flex justify-between border-t border-border pt-3 text-sm text-emerald-700 dark:text-emerald-400">
                    <span>Descuentos</span>
                    <span className="tabular-nums">−{formatCurrency(selected.summary.discount)}</span>
                  </div>
                )}
                {!!selected.items?.length && (
                  <div className="flex justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">Total estimado</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(cartValue(selected))}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
