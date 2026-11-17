import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react';
import { useCreateCounterSaleMutation } from '../../api/resources';
import { NEW_ORDER_PAYMENT_TYPES, type Id, type PaymentType, type ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { applyOfferPrice, formatPack, formatQty, paymentLabel, priceUnit } from '../../lib/domain';
import { OfferTag } from '../VariantPrice';
import { cn, formatCurrency, formatOrderNumber } from '../../lib/utils';
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
  if (!v || qty <= 0) return { units: 0, price: 0, list: 0 };
  const units = line.bulk ? qty * line.bulk : qty;
  const priceUnits = v.contentMeasure === 'KG' ? units / 1000 : units;
  const unit = v.finalPrice ?? 0;
  const after = applyOfferPrice(unit, priceUnits, v.activeOffer);
  return { units, price: after * priceUnits, list: unit * priceUnits };
}

/**
 * Venta de mostrador: `POST /order/counter`. En un paso queda entregada y
 * cobrada, descuenta stock y suma a las estadísticas (canal "Mostrador").
 * El backend recalcula precios y ofertas; si falta stock no registra nada.
 * Después de registrar, el formulario queda listo para la siguiente venta.
 */
export function CreateOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [createCounterSale] = useCreateCounterSaleMutation();
  const [last, setLast] = useState<{ id: Id; total: number } | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const valid = lines.filter((l) => l.variantId && Number(l.quantity) > 0);
  const short = lines.some((l) => l.variant && estimate(l).units > l.variant.currentStock);
  const total = useMemo(() => lines.reduce((acc, l) => acc + estimate(l).price, 0), [lines]);

  const [submit, busy] = useAction(
    () =>
      createCounterSale({
        paymentType,
        orderItems: valid.map((l) => ({
          productVariantId: l.variantId!,
          quantity: Math.round(Number(l.quantity)),
          ...(l.bulk ? { selectedBulkOption: l.bulk } : {}),
        })),
      }).unwrap(),
    { success: (o) => `Venta ${formatOrderNumber(o.id)} registrada`, error: 'No se pudo registrar la venta' },
  );

  const close = () => {
    if (busy) return;
    setLines([newLine()]);
    setLast(null);
    onClose();
  };

  const handleSubmit = async () => {
    const order = await submit().catch(() => null);
    if (order) {
      // Lista para la siguiente venta (mismo medio de pago)
      setLast({ id: order.id, total: Number(order.totalPrice) || 0 });
      setLines([newLine()]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Venta de mostrador"
      description="Se registra entregada y cobrada: descuenta stock y suma a las ventas."
      size="xl"
      footer={
        <>
          <div className="mr-auto text-sm text-muted-foreground">
            Total estimado <span className="ml-1 text-base font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
          </div>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {last ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button onClick={handleSubmit} loading={busy} disabled={!valid.length || short}>
            Registrar venta
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {last && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Venta {formatOrderNumber(last.id)} registrada por {formatCurrency(last.total)}. Podés cargar la siguiente.
            </span>
            <Link to={`/dashboard/orders/${last.id}`} onClick={close} className="shrink-0 font-medium underline underline-offset-2">
              Ver
            </Link>
          </div>
        )}
        <Field label="Medio de pago" className="sm:max-w-xs">
          <select className={inputClass} value={paymentType} onChange={(e) => setPaymentType(e.target.value as PaymentType)}>
            {NEW_ORDER_PAYMENT_TYPES.map((p) => (
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
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className={cn('font-semibold tabular-nums', est.list - est.price > 0.009 && 'text-emerald-700 dark:text-emerald-400')}>
                          {formatCurrency(est.price)}
                        </span>
                        {est.list - est.price > 0.009 && (
                          <span className="text-xs text-muted-foreground line-through tabular-nums">{formatCurrency(est.list)}</span>
                        )}
                      </div>
                      {v.activeOffer && <OfferTag label={v.activeOffer.label} className="mt-0.5" />}
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
                    Stock disponible {formatQty(v!.currentStock, v!.contentMeasure)}: no alcanza. Corregí el stock con un ajuste antes de registrar la venta.
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
            Los precios y ofertas se recalculan en el servidor. Se pueden vender productos que no estén publicados en la tienda.
            Con Mercado Pago (QR o link) registrala una vez que el cobro esté acreditado.
          </p>
        </div>
      </div>
    </Modal>
  );
}
