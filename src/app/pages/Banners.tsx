import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarRange,
  GalleryHorizontal,
  ImageIcon,
  Link2,
  Monitor,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { bannersApi, useDeleteBannerMutation, useReorderBannersMutation } from '../api/resources';
import { getErrorMessage } from '../api/client';
import { BANNER_PLACEMENTS, type Banner, type BannerPlacement } from '../api/types';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { BANNER_SIZE_LABEL, bannerState } from '../lib/domain';
import { cn, formatDateTime } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Segmented } from '../components/Filters';
import { ActiveBadge, Badge, BannerStateBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { useConfirm } from '../components/ConfirmProvider';
import { BannerFormModal } from '../components/banners/BannerFormModal';
import { formatDims, PLACEMENT_FIELDS, usePlacementSpecs } from '../components/banners/bannerSpecs';
import { cld } from '../lib/cloudinary';

const sortBanners = (a: Banner, b: Banner) => a.position - b.position || a.id - b.id;

function Thumb({ url, icon, label, className }: { url: string | null; icon: React.ReactNode; label: string; className?: string }) {
  return (
    <figure className={cn('relative overflow-hidden rounded-md border border-border bg-muted', className)}>
      {url ? (
        <img src={cld(url, { w: 640 })} alt={label} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="w-4 h-4" />
        </div>
      )}
      <figcaption className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
        {icon}
        {label}
      </figcaption>
    </figure>
  );
}

function BannerCard({
  banner: b,
  index,
  count,
  onEdit,
  onToggle,
  onDelete,
  onMove,
  moving,
}: {
  banner: Banner;
  index: number;
  count: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  moving: boolean;
}) {
  const fields = PLACEMENT_FIELDS[b.placement];
  const state = bannerState(b);
  const isAnnouncement = b.placement === 'ANNOUNCEMENT_BAR';

  return (
    <Card className={cn('flex flex-col gap-4 p-4 sm:p-4', !b.active && 'opacity-70')}>
      {isAnnouncement ? (
        <div
          className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
          style={{ backgroundColor: b.backgroundColor || undefined, color: b.textColor || undefined }}
        >
          {b.text || '—'}
        </div>
      ) : (
        <div className="flex gap-2">
          <Thumb
            url={b.desktopImageUrl}
            icon={<Monitor className="w-3 h-3" />}
            label={fields.mobile ? 'PC' : b.size ? BANNER_SIZE_LABEL[b.size] : 'Imagen'}
            className={cn('h-24 flex-1', !fields.mobile && b.size === 'SQUARE' && 'w-24 flex-none')}
          />
          {fields.mobile && (
            <Thumb
              url={b.mobileImageUrl ?? b.desktopImageUrl}
              icon={<Smartphone className="w-3 h-3" />}
              label={b.mobileImageUrl ? 'Celular' : 'Celular (usa PC)'}
              className="h-24 w-24 shrink-0"
            />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-medium" title={b.name}>
            {b.name}
          </h3>
          <RowActions
            actions={[
              { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onClick: onEdit },
              {
                label: b.active ? 'Desactivar' : 'Activar',
                icon: b.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
                onClick: onToggle,
              },
              { label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: onDelete, danger: true, separator: true },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {b.active ? <BannerStateBadge state={state} /> : <ActiveBadge active={false} />}
          {b.size && <Badge tone="violet">{BANNER_SIZE_LABEL[b.size]}</Badge>}
        </div>
        {(b.eyebrow || b.headline) && (
          <p className="text-sm">
            {b.eyebrow && <span className="mr-1 text-xs uppercase tracking-wide text-muted-foreground">{b.eyebrow}</span>}
            {b.headline}
          </p>
        )}
        {!isAnnouncement && b.text && <p className="line-clamp-2 text-xs text-muted-foreground">{b.text}</p>}
        {b.linkUrl && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 className="w-3 h-3 shrink-0" />
            <span className="truncate" title={b.linkUrl}>
              {b.ctaLabel ? `${b.ctaLabel} → ` : ''}
              {b.linkUrl}
            </span>
          </p>
        )}
        {(b.startsAt || b.endsAt) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarRange className="w-3 h-3 shrink-0" />
            {b.startsAt ? formatDateTime(b.startsAt) : 'Siempre'} → {b.endsAt ? formatDateTime(b.endsAt) : 'sin fin'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          Posición {index + 1} de {count}
        </span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Subir ${b.name}`}
            disabled={index === 0 || moving}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={`Bajar ${b.name}`}
            disabled={index === count - 1 || moving}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function Banners() {
  const [params, setParams] = useSearchParams();
  const { specs, order } = usePlacementSpecs();
  const raw = params.get('placement') as BannerPlacement | null;
  const placement: BannerPlacement = raw && BANNER_PLACEMENTS.includes(raw) ? raw : order[0];

  const q = bannersApi.useList();
  const [setActive] = bannersApi.useSetActive();
  const toggle = useActiveToggle(setActive, 'el banner');
  const [reorder, { isLoading: reordering }] = useReorderBannersMutation();
  const [remove] = useDeleteBannerMutation();
  const confirm = useConfirm();

  const [editing, setEditing] = useState<Banner | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(BANNER_PLACEMENTS.map((p) => [p, [] as Banner[]])) as Record<BannerPlacement, Banner[]>;
    (q.data ?? []).forEach((b) => map[b.placement]?.push(b));
    BANNER_PLACEMENTS.forEach((p) => map[p].sort(sortBanners));
    return map;
  }, [q.data]);

  const list = grouped[placement] ?? [];
  const spec = specs[placement];
  const liveCount = list.filter((b) => bannerState(b) === 'live').length;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setFormOpen(true);
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ids = list.map((b) => b.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await reorder(ids).unwrap();
    } catch (e) {
      toast.error('No se pudo reordenar', { description: getErrorMessage(e) });
    }
  };

  const askDelete = (b: Banner) =>
    confirm({
      title: 'Eliminar banner',
      message: (
        <>
          Se eliminará definitivamente <strong>{b.name}</strong> junto con sus imágenes. Si solo querés ocultarlo,
          desactivalo.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        await remove(b.id).unwrap();
        toast.success(`"${b.name}" eliminado`);
      },
    });

  const sizes = spec.sizes
    ? Object.entries(spec.sizes)
        .map(([k, d]) => `${BANNER_SIZE_LABEL[k as keyof typeof BANNER_SIZE_LABEL] ?? k} ${formatDims(d)}`)
        .join(' · ')
    : [spec.desktop && `PC ${formatDims(spec.desktop)}`, spec.mobile && `celular ${formatDims(spec.mobile)}`].filter(Boolean).join(' · ');

  return (
    <>
      <PageHeader
        title="Banners"
        description="Imágenes y anuncios de los espacios de la web. Se muestran los activos dentro de su vigencia, en el orden de cada ubicación."
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo banner
          </Button>
        }
      />

      <div className="overflow-x-auto">
        <Segmented<BannerPlacement>
          value={placement}
          onChange={(p) => setParams({ placement: p }, { replace: true })}
          options={order.map((p) => ({ value: p, label: specs[p].label, count: q.data ? grouped[p].length : undefined }))}
        />
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="font-medium">{spec.label}</div>
          <p className="text-sm text-muted-foreground">{spec.description}</p>
          <p className="text-xs text-muted-foreground">
            {sizes ? `Medidas recomendadas: ${sizes}.` : 'Sin imagen: solo texto.'}
            {spec.imageRequired ? ' Imagen obligatoria.' : ''}
            {spec.maxActive ? ` Se muestra${spec.maxActive === 1 ? ' solo el primero vigente' : `n hasta ${spec.maxActive}`}.` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate} className="shrink-0">
          <Plus className="w-4 h-4" /> Agregar en {spec.label.toLowerCase()}
        </Button>
      </Card>

      {spec.maxActive != null && liveCount > spec.maxActive && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 w-4 h-4 shrink-0" />
          Hay {liveCount} banners vigentes y esta ubicación muestra {spec.maxActive === 1 ? 'solo el primero' : `hasta ${spec.maxActive}`}.
          Reordenalos o desactivá los que sobran.
        </div>
      )}

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : q.error && !q.data ? (
        <Card>
          <ErrorState error={q.error} onRetry={q.refetch} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GalleryHorizontal className="w-6 h-6" />}
            title={`No hay banners en ${spec.label.toLowerCase()}`}
            description={
              placement === 'HOME_HERO'
                ? 'Mientras no haya banners, la web muestra la portada por defecto.'
                : 'Mientras no haya banners, este espacio no se muestra en la web.'
            }
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Nuevo banner
              </Button>
            }
          />
        </Card>
      ) : (
        <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity', (q.isFetching || reordering) && 'opacity-60')}>
          {list.map((b, i) => (
            <BannerCard
              key={b.id}
              banner={b}
              index={i}
              count={list.length}
              moving={reordering || q.isFetching}
              onEdit={() => openEdit(b)}
              onToggle={() => toggle(b.id, b.name, b.active)}
              onDelete={() => askDelete(b)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}

      <BannerFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} banner={editing} defaultPlacement={placement} />
    </>
  );
}
