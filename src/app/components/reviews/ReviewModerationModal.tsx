import { useEffect, useState, type FormEvent } from 'react';
import { useModerateReviewMutation } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import type { ModerateReviewInput, Review } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Field, Textarea } from '../Form';
import { FormError } from '../States';
import { Stars } from './Stars';

export type ModerationMode = 'reject' | 'reply';

interface Props {
  review: Review | null;
  mode: ModerationMode;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Rechazar (con motivo opcional) o responder una reseña. `PUT /review/:id/moderate`
 * siempre lleva un estado: responder una pendiente la aprueba; una rechazada sigue rechazada.
 */
export function ReviewModerationModal({ review, mode, isOpen, onClose }: Props) {
  const [moderate] = useModerateReviewMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !review) return;
    setError('');
    setText(mode === 'reply' ? review.reply ?? '' : review.rejectionReason ?? '');
  }, [isOpen, review, mode]);

  const reject = mode === 'reject';
  const keepsRejected = !reject && review?.status === 'REJECTED';

  const [submit, busy] = useAction(
    (body: ModerateReviewInput) => moderate({ id: review!.id, body }).unwrap(),
    {
      success: reject ? 'Reseña rechazada' : text.trim() ? 'Respuesta guardada' : 'Respuesta eliminada',
      error: 'No se pudo moderar la reseña',
    },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!review) return;
    const value = text.trim();
    if (!reject && !value && !review.reply) return setError('Escribí la respuesta.');
    const body: ModerateReviewInput = reject
      ? { status: 'REJECTED', ...(value ? { rejectionReason: value } : {}) }
      : { status: keepsRejected ? 'REJECTED' : 'APPROVED', reply: value || null };
    try {
      await submit(body);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!review) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={reject ? 'Rechazar reseña' : review.reply ? 'Editar respuesta' : 'Responder reseña'}
      description={
        reject
          ? 'La reseña no se mostrará en la web. El motivo es interno (no es público).'
          : keepsRejected
            ? 'La reseña está rechazada: la respuesta se guarda pero no se publica.'
            : review.status === 'PENDING'
              ? 'Al responder, la reseña queda aprobada y la respuesta se publica junto a ella.'
              : 'La respuesta de la tienda se muestra públicamente debajo de la reseña.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="review-moderation-form" loading={busy} variant={reject ? 'destructive' : 'primary'}>
            {reject ? 'Rechazar' : review.status === 'PENDING' ? 'Aprobar y responder' : 'Guardar respuesta'}
          </Button>
        </>
      }
    >
      <form id="review-moderation-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <FormError>{error}</FormError>}
        <blockquote className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Stars value={review.rating} size="xs" />
            <span className="font-medium">{review.authorName}</span>
          </div>
          {review.title && <div className="mt-1 font-medium">{review.title}</div>}
          {review.comment && <p className="mt-1 whitespace-pre-line text-muted-foreground">{review.comment}</p>}
        </blockquote>
        <Field
          label={reject ? 'Motivo (opcional)' : 'Respuesta de la tienda'}
          htmlFor="review-mod-text"
          hint={!reject && review.reply ? 'Dejala vacía para quitar la respuesta.' : undefined}
        >
          <Textarea
            id="review-mod-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={reject ? 'Ej. Lenguaje ofensivo, no habla del producto…' : '¡Gracias por tu compra! …'}
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  );
}
