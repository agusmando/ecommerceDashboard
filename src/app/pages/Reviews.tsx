import { useSearchParams } from 'react-router';
import { CheckCircle2, Clock, MessageSquareText, Star, XCircle } from 'lucide-react';
import { reviewsApi, useReviewStatsQuery } from '../api/resources';
import type { Id, ReviewOrder, ReviewStatus } from '../api/types';
import { useListFilters } from '../hooks/useListFilters';
import { cn } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { Pagination } from '../components/Pagination';
import { FilterBar, FilterSelect, SearchInput, Segmented } from '../components/Filters';
import { EmptyState, ErrorState, TableSkeleton } from '../components/States';
import { ProductPicker } from '../components/CatalogPickers';
import { ReviewItem, useReviewActions } from '../components/reviews/ReviewItem';
import { GoogleReviewsPanel } from '../components/reviews/GoogleReviewsPanel';

type Tab = 'products' | 'google';

/** Filtros de la pestaña Productos (también los setea el detalle de producto). */
const REVIEW_FILTER_DEFAULTS = {
  status: 'PENDING' as ReviewStatus | '',
  rating: '',
  product: null as { id: Id; name: string } | null,
  search: '',
  orderBy: 'recent' as ReviewOrder,
};

function ProductReviews() {
  const f = useListFilters('reviews', REVIEW_FILTER_DEFAULTS, { textKeys: ['search'], pageSize: 10 });
  const d = f.debounced;
  const stats = useReviewStatsQuery();
  const actions = useReviewActions();

  const q = reviewsApi.usePage({
    status: d.status,
    rating: d.rating ? Number(d.rating) : '',
    productId: d.product?.id ?? '',
    search: d.search.trim(),
    orderBy: d.orderBy,
    currentPage: f.values.page,
    amountPerPage: f.values.pageSize,
  });
  const rows = q.data?.content;
  const s = stats.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pendientes" value={s?.pending ?? '—'} icon={<Clock className="w-5 h-5" />} loading={stats.isLoading} hint="Esperan moderación" />
        <StatTile label="Aprobadas" value={s?.approved ?? '—'} icon={<CheckCircle2 className="w-5 h-5" />} loading={stats.isLoading} hint="Visibles en la web" />
        <StatTile label="Rechazadas" value={s?.rejected ?? '—'} icon={<XCircle className="w-5 h-5" />} loading={stats.isLoading} />
        <StatTile
          label="Promedio"
          value={s ? s.average.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—'}
          icon={<Star className="w-5 h-5" />}
          loading={stats.isLoading}
          hint="De las aprobadas"
        />
      </div>

      <div className="overflow-x-auto">
        <Segmented
          value={f.values.status}
          onChange={(status) => f.set({ status })}
          options={[
            { value: 'PENDING' as ReviewStatus | '', label: 'Pendientes', count: s?.pending },
            { value: 'APPROVED', label: 'Aprobadas', count: s?.approved },
            { value: 'REJECTED', label: 'Rechazadas', count: s?.rejected },
            { value: '', label: 'Todas' },
          ]}
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-border p-3 sm:p-4">
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <SearchInput value={f.values.search} onChange={(search) => f.set({ search })} placeholder="Buscar en título o comentario…" />
            <div className="w-full sm:w-64">
              <ProductPicker
                value={f.values.product?.id ?? null}
                label={f.values.product?.name}
                clearable
                placeholder="Todos los productos"
                className="min-h-9 py-1"
                onChange={(id, name) => f.set({ product: id ? { id, name: name ?? `Producto #${id}` } : null })}
              />
            </div>
            <FilterSelect
              value={f.values.rating}
              onChange={(rating) => f.set({ rating })}
              placeholder="Todas las estrellas"
              label="Calificación"
              options={['5', '4', '3', '2', '1'].map((n) => ({ value: n, label: `${n} ${n === '1' ? 'estrella' : 'estrellas'}` }))}
            />
            <FilterSelect<ReviewOrder>
              value={f.values.orderBy}
              onChange={(orderBy) => f.set({ orderBy: orderBy || 'recent' })}
              placeholder="Más recientes"
              label="Orden"
              options={[
                { value: 'rating_desc', label: 'Mejor calificadas' },
                { value: 'rating_asc', label: 'Peor calificadas' },
              ]}
            />
          </FilterBar>
        </div>

        {q.isLoading && !rows ? (
          <TableSkeleton rows={4} columns={3} />
        ) : q.error && !rows ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !rows?.length ? (
          <EmptyState
            icon={<MessageSquareText className="w-6 h-6" />}
            title={
              f.values.status === 'PENDING' && f.activeCount === 0
                ? 'No hay reseñas pendientes de moderar'
                : 'No hay reseñas con esos filtros'
            }
            description="Solo pueden reseñar quienes compraron y recibieron la variante. Cada reseña nueva o editada queda pendiente hasta que la apruebes."
          />
        ) : (
          <div className={cn('divide-y divide-border transition-opacity', q.isFetching && 'opacity-60')}>
            {rows.map((r) => (
              <ReviewItem key={r.id} review={r} actions={actions} />
            ))}
          </div>
        )}

        {rows?.length || f.values.page > 1 ? (
          <Pagination
            pagination={q.data?.pagination}
            page={f.values.page}
            pageSize={f.values.pageSize}
            onPageChange={f.setPage}
            onPageSizeChange={f.setPageSize}
            disabled={q.isFetching}
          />
        ) : null}
      </Card>

      {actions.element}
    </div>
  );
}

export default function Reviews() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'google' ? 'google' : 'products';

  return (
    <>
      <PageHeader
        title="Reseñas"
        description="Moderá las reseñas de productos de compradores verificados y elegí qué reseñas de Google se muestran en la web."
      />
      <Segmented<Tab>
        value={tab}
        onChange={(t) => setParams(t === 'google' ? { tab: 'google' } : {}, { replace: true })}
        options={[
          { value: 'products', label: 'Productos' },
          { value: 'google', label: 'Google' },
        ]}
      />
      {tab === 'products' ? <ProductReviews /> : <GoogleReviewsPanel />}
    </>
  );
}
