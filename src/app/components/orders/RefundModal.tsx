import { useEffect, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle } from 'lucide-react';
import { useRefundInfoQuery, useRefundOrderPaymentMutation } from '../../api/resources';
import type { Order } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { cn, formatCurrency } from '../../lib/utils';
import { Button } from '../Button';
import { AffixInput, Field, Textarea } from '../Form';
import { Modal } from '../Modal';
import { ErrorState, Skeleton } from '../States';

type Mode = 'total' | 'partial';

/**
 * Devolver dinero por Mercado Pago (total o parcial). Los importes se consultan
 * en vivo a Mercado Pago al abrir; el backend vuelve a validar el máximo.
 * No toca stock ni ítems: eso se registra antes con "Devolver" / "Cancelar" ítem.
 */
export function RefundModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { data: info, isFetching, error, refetch } = useRefundInfoQuery(open ? order.id : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const [refund] = useRefundOrderPaymentMutation();
  const [mode, setMode] = useState<Mode>('partial');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Al abrir: si hay un monto sugerido menor al disponible, parcial con ese monto; si no, total.
  useEffect(() => {
    if (!open || !info) return;
    const partial = info.suggested > 0 && info.suggested < info.refundable;
    setMode(partial ? 'partial' : 'total');
    setAmount(partial ? String(info.suggested) : '');
    setReason('');
  }, [open, info]);

  const value = mode === 'total' ? info?.refundable ?? 0 : Number(amount.replace(',', '.'));
  const tooMuch = !!info && value > info.refundable + 0.001;
  const valid = !!info && info.refundable > 0 && Number.isFinite(value) && value > 0 && !tooMuch;

  const [save, busy] = useAction(
    () =>
      refund({
        orderId: order.id,
        amount: mode === 'total' ? undefined : Math.round(value * 100) / 100,
        reason: reason.trim() || undefined,
      }).unwrap(),
    { success: `Devolviste ${formatCurrency(value)} por Mercado Pago`, error: 'No se pudo hacer la devolución' },
  );

  return (
    <Modal
      isOpen={open}
      onClose={busy ? () => {} : onClose}
      title="Devolver dinero"
      description="El reintegro se hace por Mercado Pago, al mismo medio con el que pagó el cliente."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={!valid || isFetching} onClick={() => save().then(onClose).catch(() => undefined)}>
            Devolver {valid ? formatCurrency(value) : ''}
          </Button>
        </>
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !info || isFetching ? (
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">Cobrado</dt>
            <dd className="text-right tabular-nums">{formatCurrency(info.paid)}</dd>
            <dt className="text-muted-foreground">Ya devuelto</dt>
            <dd className="text-right tabular-nums">{formatCurrency(info.refunded)}</dd>
            <dt className="text-muted-foreground">Total actual del pedido</dt>
            <dd className="text-right tabular-nums">{formatCurrency(info.currentTotal)}</dd>
            <dt className="font-medium">Disponible para devolver</dt>
            <dd className="text-right font-semibold tabular-nums">{formatCurrency(info.refundable)}</dd>
          </dl>

          {info.refundable <= 0 ? (
            <p className="rounded-lg bg-muted p-3 text-muted-foreground">
              {info.paymentStatus === 'refunded' ? 'El pago ya se devolvió completo.' : `No hay saldo para devolver (estado en Mercado Pago: ${info.paymentStatus}).`}
            </p>
          ) : (
            <>
              {info.suggested > 0 && (
                <p className="rounded-lg bg-primary/5 p-3 text-foreground">
                  Sugerido: <strong>{formatCurrency(info.suggested)}</strong>
                  {order.status === 'CANCELLED' ? ' (el pedido está cancelado).' : ', lo cobrado de más por productos devueltos o cancelados.'}
                </p>
              )}

              <div role="radiogroup" aria-label="Tipo de devolución" className="grid grid-cols-2 gap-2">
                {(['partial', 'total'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors',
                      mode === m ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span className="block font-medium">{m === 'partial' ? 'Parcial' : 'Total'}</span>
                    <span className="text-xs">{m === 'partial' ? 'Elegís el monto' : `Todo: ${formatCurrency(info.refundable)}`}</span>
                  </button>
                ))}
              </div>

              {mode === 'partial' && (
                <Field
                  label="Monto a devolver"
                  hint={`Máximo ${formatCurrency(info.refundable)}.`}
                  error={amount !== '' && !valid ? (tooMuch ? 'Supera lo disponible' : 'Monto inválido') : undefined}
                >
                  <AffixInput
                    prefix="$"
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    max={info.refundable}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </Field>
              )}

              <Field label="Motivo (opcional)" hint="Queda registrado en el pedido.">
                <Textarea value={reason} maxLength={300} rows={2} onChange={(e) => setReason(e.target.value)} placeholder="Devolvió 1 frasco de miel" />
              </Field>

              <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                No se puede deshacer. El stock y los ítems no cambian: si el cliente devolvió productos, registralo en los ítems.
                Mercado Pago necesita saldo disponible en la cuenta para hacer el reintegro.
              </p>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
