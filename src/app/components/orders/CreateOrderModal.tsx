import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, Info, Plus, Trash2 } from 'lucide-react';
import { ordersApi } from '../../api/resources';
import { PAYMENT_TYPES, type Id, type PaymentType, type ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { formatPack, formatQty, paymentLabel, priceUnit } from '../../lib/domain';
import { formatCurrency, formatOrderNumber } from '../../lib/utils';
import { Button } from '../Button';
import { VariantPicker, variantLabel } from '../CatalogPickers';
import { Field, inputClass } from '../Form';
import { Modal } from '../Modal';

interface Line {
  key: number;
  variantId: Id | null;
  variant?: ProductVariant;
  /** 0 = suelto. */
  bulk: number;
  quantity: string;
}

let seq = 0;
const newLine = (): Line => ({ key: ++seq, variantId: null, bulk: 0, quantity: '1' });

/** Unidades de stock (g/u) y precio estimado de una línea. */
function estimate(line: Line) {
  const v = line.variant;
  const qty = Number(line.quantity) || 0;
  if (!v || qty <= 0) return { units: 0, price: 0 };
  const units = line.bulk ? qty * line.bulk : qty;
  const priceUnits = v.contentMeasure === 'KG' ? units / 1000 : units;
  return { units, price: (v.finalPrice ?? 0) * priceUnits };
}

/**
 * Venta manual (mostrador): `POST /order`. El backend asigna la orden al
 * usuario logueado, recalcula precios y ofertas, y si falta stock ajusta o
 * cancela líneas (409 si no hay stock para ninguna).
 */
export function CreateOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [create] = ordersApi.useCreate();
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const valid = lines.filter((l) => l.variantId && Number(l.quantity) > 0);
  const total = useMemo(() => lines.reduce((acc, l) => acc + estimate(l).price, 0), [lines]);

  const [submit, busy] = useAction(
    () =>
      create({
        paymentType,
        orderItems: valid.map((l) => ({
          productVariantId: l.variantId!,
          quantity: Math.round(Number(l.quantity)),
          ...(l.bulk ? { selectedBulkOption: l.bulk } : {}),
        })),
      }),
    { success: (o) => `Orden ${formatOrderNumber(o.id)} creada`, error: 'No se pudo crear la orden' },
  );

  const close = () => {
    if (busy) return;
    setLines([newLine()]);
    onClose();
  };

  const handleSubmit = async () => {
    const order = await submit().catch(() => null);
    if (order) {
      setLines([newLine()]);
      onClose();
      navigate(`/dashboard/orders/${order.id}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Nueva venta"
      description="Venta manual de mostrador. La orden queda a nombre de tu usuario y nace en Pendiente."
      size="xl"
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">
            Total estimado <span className="ml-1 text-base font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
          </div>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={busy} disabled={!valid.length}>
            Crear orden
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Medio de pago" className="sm:max-w-xs">
          <select className={inputClass} value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
            {PAYMENT_TYPES.map((p) => (
              <option key={p} value={p}>
                {paymentLabel(p)}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-3">
          {lines.map((line, i) => {
            const v = line.variant;
            const est = estimate(line);
            const short = v && est.units > v.currentStock;
            const packs = v?.packagingOptions?.filter((n) => n > 0) ?? [];
            return (
              <div key={line.key} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Field label={`Producto ${i + 1}`}>
                      <VariantPicker
                        value={line.variantId}
                        selectedLabel={v ? variantLabel(v) : undefined}
                        exclude={[]}
                        onChange={(id, variant) =>
                          patch(line.key, {
                            variantId: id,
                            variant,
                            bulk: variant?.packagingOptions?.filter((n) => n > 0).sort((a, b) => a - b)[0] ?? 0,
                            quantity: '1',
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-7"
                    aria-label="Quitar línea"
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {v && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Presentación">
                      <select
                        className={inputClass}
                        value={line.bulk}
                        onChange={(e) => patch(line.key, { bulk: Number(e.target.value), quantity: '1' })}
                      >
                        {packs.map((p) => (
                          <option key={p} value={p}>
                            Paquete de {formatPack(p, v.contentMeasure)}
                          </option>
                        ))}
                        <option value={0}>Suelto ({v.contentMeasure === 'KG' ? 'gramos' : 'unidades'})</option>
                      </select>
                    </Field>
                    <Field
                      label={line.bulk ? 'Cantidad de paquetes' : v.contentMeasure === 'KG' ? 'Gramos' : 'Unidades'}
                    >
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className={inputClass}
                        value={line.quantity}
                        onChange={(e) => patch(line.key, { quantity: e.target.value })}
                      />
                    </Field>
                    <div className="text-sm sm:pt-7">
                      <div className="font-semibold tabular-nums">{formatCurrency(est.price)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(v.finalPrice)}
                        {priceUnit(v.contentMeasure)} · {formatQty(est.units, v.contentMeasure)}
                      </div>
                    </div>
                  </div>
                )}

                {short && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Stock disponible {formatQty(v!.currentStock, v!.contentMeasure)}: la línea se ajustará o cancelará.
                  </div>
                )}
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
            <Plus className="w-4 h-4" />
            Agregar producto
          </Button>
        </div>

        <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" />
          <p>
            Los precios y ofertas se recalculan en el servidor. Si no alcanza el stock, la línea queda como{' '}
            <em>Parcial</em> o <em>Cancelada</em>; si no hay stock para ningún producto la orden no se crea.
          </p>
        </div>
      </div>
    </Modal>
  );
}
