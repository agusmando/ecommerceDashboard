import { toast } from 'sonner';
import { AlertTriangle, ExternalLink, Info, RefreshCw, Star } from 'lucide-react';
import {
  useGoogleReviewsQuery,
  useSyncGoogleReviewsMutation,
  useUpdateGoogleReviewMutation,
} from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import type { GoogleReview } from '../../api/types';
import { cn, formatDateTime, formatNumber, formatRelative } from '../../lib/utils';
import { Card, CardTitle } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { EmptyState, ErrorState, Skeleton } from '../States';
import { StatTile } from '../StatTile';
import { useErrorModal } from '../ErrorProvider';
import { Switch } from '../ui/switch';
import { Stars } from './Stars';

/** Mismo link de Maps que usa la web. */
const GOOGLE_MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Canela+en+rama';

function Toggle({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 text-sm sm:justify-start">
      <span className="text-muted-foreground">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

function GoogleReviewRow({ review: r }: { review: GoogleReview }) {
  const [update, { isLoading }] = useUpdateGoogleReviewMutation();
  const showError = useErrorModal();
  const set = async (patch: { featured?: boolean; active?: boolean }, msg: string) => {
    try {
      await update({ id: r.id, body: patch }).unwrap();
      toast.success(msg);
    } catch (e) {
      showError({ title: 'No se pudo actualizar la reseña', description: getErrorMessage(e) });
    }
  };
  return (
    <li className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-start', !r.active && 'opacity-60')}>
      <div className="flex min-w-0 flex-1 gap-3">
        {r.authorPhotoUrl ? (
          <img src={r.authorPhotoUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {r.authorName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {r.authorUrl ? (
              <a href={r.authorUrl} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {r.authorName}
              </a>
            ) : (
              <span className="font-medium">{r.authorName}</span>
            )}
            <Stars value={r.rating} size="xs" />
            {r.featured && r.active && <Badge tone="success">En la web</Badge>}
          </div>
          <div className="text-xs text-muted-foreground" title={r.publishedAt ? formatDateTime(r.publishedAt) : undefined}>
            {r.relativeTime || formatRelative(r.publishedAt)}
          </div>
          {r.text ? (
            <p className="whitespace-pre-line text-sm text-foreground/90 break-words">{r.text}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Sin texto, solo calificación.</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Toggle
          id={`gr-featured-${r.id}`}
          label="Destacar en la web"
          checked={r.featured}
          disabled={isLoading}
          onChange={(featured) => set({ featured }, featured ? 'Reseña destacada en la web' : 'Reseña quitada de la web')}
        />
        <Toggle
          id={`gr-active-${r.id}`}
          label="Activa"
          checked={r.active}
          disabled={isLoading}
          onChange={(active) => set({ active }, active ? 'Reseña activada' : 'Reseña desactivada')}
        />
      </div>
    </li>
  );
}

/** Pestaña "Google": resumen del lugar, sincronización y selección de reseñas destacadas. */
export function GoogleReviewsPanel() {
  const showError = useErrorModal();
  const { data, isLoading, error, refetch, isFetching } = useGoogleReviewsQuery();
  const [sync, { isLoading: syncing }] = useSyncGoogleReviewsMutation();

  const runSync = async () => {
    try {
      const r = await sync().unwrap();
      toast.success('Reseñas sincronizadas', {
        description: r.synced ? `Se recibieron ${r.synced} reseñas de Google.` : 'Google no devolvió reseñas nuevas.',
      });
    } catch (e) {
      showError({ title: 'No se pudo sincronizar con Google', description: getErrorMessage(e) });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <ErrorState error={error ?? new Error('Sin datos')} onRetry={refetch} title="No se pudieron cargar las reseñas de Google" />
      </Card>
    );
  }

  const { place, reviews } = data;
  const featured = reviews.filter((r) => r.featured && r.active).length;

  return (
    <div className="space-y-6">
      {!place.configured && (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
          <div>
            <strong>Google no está configurado.</strong> Falta la variable <code>GOOGLE_PLACES_API_KEY</code> en el backend
            (el local se busca solo por nombre; opcionalmente fijalo con <code>GOOGLE_PLACE_ID</code>). Hasta entonces no se puede
            sincronizar.
          </div>
        </div>
      )}
      {place.configured && place.lastError && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
          <div>
            <strong>La última sincronización falló:</strong> {place.lastError}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Calificación en Google"
          value={place.rating != null ? place.rating.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—'}
          hint={place.rating != null ? <Stars value={place.rating} size="xs" /> : 'Sin datos todavía'}
          icon={<Star className="w-5 h-5" />}
        />
        <StatTile
          label="Opiniones en Google"
          value={place.userRatingCount != null ? formatNumber(place.userRatingCount) : '—'}
          hint={`${reviews.length} guardadas · ${featured} en la web`}
        />
        <Card className="flex flex-col justify-between gap-3 p-4 sm:p-5">
          <div>
            <div className="text-sm text-muted-foreground">Última sincronización</div>
            <div className="mt-1 font-medium" title={place.lastSyncAt ? formatDateTime(place.lastSyncAt) : undefined}>
              {place.lastSyncAt ? formatRelative(place.lastSyncAt) : 'Nunca'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={runSync} loading={syncing} disabled={!place.configured || isFetching}>
              {!syncing && <RefreshCw className="w-4 h-4" />}
              Sincronizar con Google
            </Button>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              Ver en Google Maps <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </Card>
      </div>

      <Card className="p-0 sm:p-0 overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-border p-4">
          <CardTitle>{place.name ? `Reseñas de ${place.name}` : 'Reseñas de Google'}</CardTitle>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
            Google devuelve como máximo 5 reseñas por sincronización (las más relevantes); se van acumulando acá. La web
            solo muestra las destacadas y activas, y se resincroniza sola cada 24 h.
          </p>
        </div>
        {reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="w-6 h-6" />}
            title="Todavía no hay reseñas de Google"
            description={place.configured ? 'Sincronizá para traer las reseñas del local.' : 'Configurá Google en el backend para poder sincronizar.'}
          />
        ) : (
          <ul className={cn('divide-y divide-border transition-opacity', isFetching && 'opacity-60')}>
            {reviews.map((r) => (
              <GoogleReviewRow key={r.id} review={r} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
