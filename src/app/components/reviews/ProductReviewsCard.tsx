import { useNavigate } from 'react-router';
import { ArrowUpRight, MessageSquareText } from 'lucide-react';
import { reviewsApi, useReviewSummaryQuery } from '../../api/resources';
import type { Product } from '../../api/types';
import { useAppDispatch } from '../../store';
import { patchFilters } from '../../store/filtersSlice';
import { useCan } from '../../hooks/useCan';
import { Card, CardHeader, CardTitle } from '../Card';
import { Button } from '../Button';
import { ErrorState, Skeleton } from '../States';
import { ReviewItem, useReviewActions } from './ReviewItem';
import { Stars } from './Stars';

const LATEST = 5;

/** Resumen (solo aprobadas) + últimas reseñas del producto en cualquier estado. */
export function ProductReviewsCard({ product }: { product: Pick<Product, 'id' | 'name'> }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const summary = useReviewSummaryQuery(product.id);
  const latest = reviewsApi.usePage({ productId: product.id, orderBy: 'recent', amountPerPage: LATEST });
  const actions = useReviewActions();
  // La página de reseñas (y la moderación) requiere content.edit.
  const canModerate = useCan()('content.edit');
  const s = summary.data;
  const rows = latest.data?.content ?? [];
  const total = latest.data?.pagination.totalAmount ?? 0;

  const openAll = () => {
    dispatch(
      patchFilters({
        key: 'reviews',
        patch: { product: { id: product.id, name: product.name }, status: '', rating: '', search: '', page: 1 },
      }),
    );
    navigate('/dashboard/reviews');
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Reseñas</CardTitle>
        {canModerate && (
          <Button variant="ghost" size="sm" onClick={openAll} disabled={!total}>
            Ver todas{total ? ` (${total})` : ''} <ArrowUpRight className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          {summary.isLoading ? (
            <Skeleton className="h-28" />
          ) : s ? (
            <>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold tabular-nums">
                  {s.count ? s.average.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—'}
                </span>
                <Stars value={s.average} className="mb-1.5" />
              </div>
              <div className="text-xs text-muted-foreground">
                {s.count} {s.count === 1 ? 'reseña aprobada' : 'reseñas aprobadas'}
              </div>
              <div className="space-y-1" aria-label="Distribución de calificaciones">
                {([5, 4, 3, 2, 1] as const).map((n) => {
                  const c = s.distribution?.[n] ?? 0;
                  const pct = s.count ? (c / s.count) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-3 tabular-nums text-muted-foreground">{n}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right tabular-nums text-muted-foreground">{c}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : summary.error ? (
            <p className="text-sm text-muted-foreground">No se pudo cargar el resumen.</p>
          ) : null}
        </div>

        <div className="min-w-0">
          {latest.isLoading ? (
            <Skeleton className="h-32" />
          ) : latest.error ? (
            <ErrorState error={latest.error} onRetry={latest.refetch} className="py-6" />
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center gap-3 text-sm text-muted-foreground">
              <MessageSquareText className="w-5 h-5 shrink-0" />
              Todavía no hay reseñas de este producto. Las pueden dejar quienes recibieron una compra.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <ReviewItem key={r.id} review={r} actions={actions} showProduct={false} compact />
              ))}
            </div>
          )}
        </div>
      </div>
      {actions.element}
    </Card>
  );
}
