import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { BadgeCheck, Check, ImageIcon, MessageSquareReply, Trash2, X } from 'lucide-react';
import { useDeleteReviewMutation, useModerateReviewMutation } from '../../api/resources';
import type { Review } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { cn, formatDateTime, formatRelative } from '../../lib/utils';
import { Badge, ReviewStatusBadge } from '../Badge';
import { Button } from '../Button';
import { useConfirm } from '../ConfirmProvider';
import { RowActions } from '../RowActions';
import { ReviewModerationModal, type ModerationMode } from './ReviewModerationModal';
import { Stars } from './Stars';

/** Acciones de moderación compartidas por la página de reseñas y el detalle de producto. */
export function useReviewActions() {
  const [moderate] = useModerateReviewMutation();
  const [remove] = useDeleteReviewMutation();
  const confirm = useConfirm();
  const [modal, setModal] = useState<{ review: Review; mode: ModerationMode } | null>(null);
  const [open, setOpen] = useState(false);

  const [approve, approving] = useAction((r: Review) => moderate({ id: r.id, body: { status: 'APPROVED' } }).unwrap(), {
    success: 'Reseña aprobada',
    error: 'No se pudo aprobar la reseña',
  });

  const askDelete = (r: Review) =>
    confirm({
      title: 'Eliminar reseña',
      message: (
        <>
          Se eliminará definitivamente la reseña de <strong>{r.authorName}</strong>. Si solo querés ocultarla, rechazala.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
      onConfirm: () => remove(r.id).unwrap(),
    });

  const show = (review: Review, mode: ModerationMode) => {
    setModal({ review, mode });
    setOpen(true);
  };

  const element: ReactNode = modal ? (
    <ReviewModerationModal review={modal.review} mode={modal.mode} isOpen={open} onClose={() => setOpen(false)} />
  ) : null;

  return {
    approve: (r: Review) => approve(r).catch(() => undefined),
    approving,
    reject: (r: Review) => show(r, 'reject'),
    reply: (r: Review) => show(r, 'reply'),
    remove: askDelete,
    element,
  };
}

type Actions = ReturnType<typeof useReviewActions>;

/** Una reseña con su producto/variante, autor, estado y acciones. */
export function ReviewItem({ review: r, actions, showProduct = true, compact }: { review: Review; actions: Actions; showProduct?: boolean; compact?: boolean }) {
  const variant = r.productVariant;
  const img = variant?.images?.[0]?.secure_url;

  return (
    <article className={cn('flex flex-col gap-3 sm:flex-row sm:items-start', compact ? 'py-3' : 'p-4')}>
      {showProduct && (
        <Link
          to={`/dashboard/products/${variant?.product.id ?? r.productId}`}
          className="flex shrink-0 items-center gap-3 sm:w-52"
          title="Ver producto"
        >
          {img ? (
            <img src={img} alt="" className="h-12 w-12 rounded-md border border-border object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium hover:underline">{variant?.product.name ?? `Producto #${r.productId}`}</div>
            <div className="truncate text-xs text-muted-foreground">{variant?.name ?? `Variante #${r.productVariantId}`}</div>
          </div>
        </Link>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Stars value={r.rating} />
          <ReviewStatusBadge status={r.status} />
          {r.verifiedPurchase && (
            <Badge tone="success" title="Compró y recibió este producto">
              <BadgeCheck className="w-3 h-3" /> Compra verificada
            </Badge>
          )}
          {!showProduct && variant && <Badge>{variant.name}</Badge>}
        </div>
        {r.title && <h3 className="font-medium text-foreground">{r.title}</h3>}
        {r.comment ? (
          <p className="whitespace-pre-line text-sm text-foreground/90 break-words">{r.comment}</p>
        ) : (
          !r.title && <p className="text-sm italic text-muted-foreground">Sin comentario, solo calificación.</p>
        )}
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{r.user?.name || r.authorName}</span>
          {r.user?.email && <> · {r.user.email}</>}
          {' · '}
          <time dateTime={r.createdAt} title={formatDateTime(r.createdAt)}>
            {formatRelative(r.createdAt)}
          </time>
          {r.updatedAt !== r.createdAt && r.status === 'PENDING' && ' · editada'}
        </div>
        {r.status === 'REJECTED' && r.rejectionReason && (
          <p className="text-xs text-red-700 dark:text-red-400">Motivo del rechazo: {r.rejectionReason}</p>
        )}
        {r.reply && (
          <div className="mt-2 rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm">
            <div className="text-xs font-medium text-primary">
              Respuesta de la tienda{r.repliedAt ? ` · ${formatRelative(r.repliedAt)}` : ''}
            </div>
            <p className="whitespace-pre-line text-foreground/90">{r.reply}</p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {r.status !== 'APPROVED' && (
            <Button size="sm" onClick={() => actions.approve(r)} disabled={actions.approving}>
              <Check className="w-4 h-4" /> Aprobar
            </Button>
          )}
          {r.status !== 'REJECTED' && (
            <Button size="sm" variant="outline" onClick={() => actions.reject(r)}>
              <X className="w-4 h-4" /> Rechazar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => actions.reply(r)} aria-label={r.reply ? 'Editar respuesta' : 'Responder'}>
            <MessageSquareReply className="w-4 h-4" />
            <span className="hidden md:inline">{r.reply ? 'Editar respuesta' : 'Responder'}</span>
          </Button>
          <RowActions
            actions={[{ label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => actions.remove(r), danger: true }]}
          />
        </div>
      </div>
    </article>
  );
}
