import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { offersApi } from '../../api/resources';
import { DISCOUNT_TYPES, type DiscountType, type Id, type Offer, type OfferInput, type ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { getErrorMessage } from '../../api/client';
import { DISCOUNT_TYPE, describeOffer, isoToLocalInput } from '../../lib/domain';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { AffixInput, Field, FormGrid, inputClass, num } from '../Form';
import { Segmented } from '../Filters';
import { FormError } from '../States';
import { ProductPicker, VariantPicker, variantLabel } from '../CatalogPickers';

const HELP: Record<DiscountType, string> = {
  PERCENTAGE: 'Descuento porcentual sobre el precio de venta.',
  FIXED: 'Resta un monto fijo por kg o unidad de precio.',
  BUY_MORE_GET_MORE: 'El cliente lleva N y paga M (ej. lleva 3, paga 2).',
  BUY_ONE_GET_MORE: 'Promoción heredada.',
  BUY_MORE_GET_DISCOUNT: 'A partir de N kg/u se aplica un % de descuento.',
  BUY_MORE_GET_FIXED_DISCOUNT: 'A partir de N kg/u se resta un monto fijo.',
};

const needsValue = (t: DiscountType) => t !== 'BUY_MORE_GET_MORE' && t !== 'BUY_ONE_GET_MORE';
const needsQty = (t: DiscountType) => t.startsWith('BUY_');
const isPercent = (t: DiscountType) => t === 'PERCENTAGE' || t === 'BUY_MORE_GET_DISCOUNT';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  offer?: Offer | null;
}

export function OfferFormModal({ isOpen, onClose, offer }: Props) {
  const editing = !!offer;
  const [create] = offersApi.useCreate();
  const [update] = offersApi.useUpdate();

  const [target, setTarget] = useState<'variant' | 'product'>('variant');
  const [variantId, setVariantId] = useState<Id | null>(null);
  const [variant, setVariant] = useState<ProductVariant | undefined>();
  const [productId, setProductId] = useState<Id | null>(null);
  const [productName, setProductName] = useState<string | undefined>();
  const [type, setType] = useState<DiscountType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [qty, setQty] = useState('');
  const [toGet, setToGet] = useState('');
  const [threshold, setThreshold] = useState('');
  const [start, setStart] = useState('');
  const [finish, setFinish] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (offer) {
      const isVar = offer.productVariantId != null;
      setTarget(isVar ? 'variant' : 'product');
      setVariantId(offer.productVariantId);
      setVariant(offer.ProductVariant ?? undefined);
      setProductId(offer.productId);
      setProductName(offer.Product?.name);
      setType(offer.discountType);
      setValue(offer.discountValue?.toString() ?? '');
      setQty(offer.discountQuantity?.toString() ?? '');
      setToGet(offer.quantityToGet?.toString() ?? '');
      setThreshold(offer.stockThreshold?.toString() ?? '');
      setStart(isoToLocalInput(offer.startTime));
      setFinish(isoToLocalInput(offer.finishTime));
    } else {
      setTarget('variant');
      setVariantId(null);
      setVariant(undefined);
      setProductId(null);
      setProductName(undefined);
      setType('PERCENTAGE');
      setValue('');
      setQty('');
      setToGet('');
      setThreshold('');
      const now = new Date();
      setStart(isoToLocalInput(now.toISOString()));
      setFinish(isoToLocalInput(new Date(now.getTime() + 30 * 86400000).toISOString()));
    }
  }, [isOpen, offer]);

  const measure = target === 'variant' ? variant?.contentMeasure : undefined;
  const unit = measure === 'KG' ? 'kg' : 'u';

  const body = useMemo((): OfferInput => {
    const b: OfferInput = {
      discountType: type,
      startTime: start ? new Date(start).toISOString() : '',
      finishTime: finish ? new Date(finish).toISOString() : '',
    };
    if (target === 'variant' && variantId) b.productVariantId = variantId;
    if (target === 'product' && productId) b.productId = productId;
    if (needsValue(type)) b.discountValue = num(value);
    if (needsQty(type)) b.discountQuantity = num(qty);
    if (type === 'BUY_MORE_GET_MORE' || type === 'BUY_ONE_GET_MORE') b.quantityToGet = num(toGet);
    const th = num(threshold);
    if (th !== undefined) b.stockThreshold = th;
    return b;
  }, [type, start, finish, target, variantId, productId, value, qty, toGet, threshold]);

  const preview = describeOffer(
    {
      discountType: type,
      discountValue: body.discountValue ?? null,
      discountQuantity: body.discountQuantity ?? null,
      quantityToGet: body.quantityToGet ?? null,
    } as Offer,
    measure,
  );

  const validate = (): string => {
    if (target === 'variant' && !variantId) return 'Elegí una variante.';
    if (target === 'product' && !productId) return 'Elegí un producto.';
    if (needsValue(type) && !(Number(body.discountValue) > 0)) return 'Ingresá el valor del descuento.';
    if (isPercent(type) && Number(body.discountValue) > 100) return 'El porcentaje no puede superar 100.';
    if (needsQty(type) && !(Number(body.discountQuantity) > 0)) return 'Ingresá la cantidad mínima.';
    if (type === 'BUY_MORE_GET_MORE') {
      if (!(Number(body.quantityToGet) > 0)) return 'Ingresá cuántas paga.';
      if (Number(body.quantityToGet) >= Number(body.discountQuantity)) return 'Lo que paga debe ser menor a lo que lleva.';
    }
    if (!start || !finish) return 'Completá las fechas de vigencia.';
    if (new Date(finish) <= new Date(start)) return 'La fecha de fin debe ser posterior al inicio.';
    return '';
  };

  const [submit, busy] = useAction(
    async () => (editing ? update(offer!.id, body) : create(body)),
    { success: editing ? 'Oferta actualizada' : 'Oferta creada', error: 'No se pudo guardar la oferta' },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    try {
      await submit();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={editing ? `Editar oferta #${offer!.id}` : 'Nueva oferta'}
      description="Si hay varias vigentes se usa la más reciente: primero las de la variante y después las del producto."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="offer-form" loading={busy}>
            {editing ? 'Guardar cambios' : 'Crear oferta'}
          </Button>
        </>
      }
    >
      <form id="offer-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError>{error}</FormError>}

        <Field label="Aplica a" hint="Una oferta aplica a una variante o a todas las variantes de un producto (no a ambos).">
          <div className="space-y-2">
            <Segmented
              value={target}
              onChange={setTarget}
              options={[
                { value: 'variant', label: 'Variante' },
                { value: 'product', label: 'Producto' },
              ]}
            />
            {target === 'variant' ? (
              <VariantPicker
                value={variantId}
                selectedLabel={variant ? variantLabel(variant) : variantId ? `Variante #${variantId}` : undefined}
                onChange={(id, v) => {
                  setVariantId(id);
                  setVariant(v);
                }}
              />
            ) : (
              <ProductPicker
                value={productId}
                label={productName ?? (productId ? `Producto #${productId}` : undefined)}
                onChange={(id, name) => {
                  setProductId(id);
                  setProductName(name);
                }}
              />
            )}
          </div>
        </Field>

        <Field label="Tipo de descuento" hint={HELP[type]}>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
            {DISCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DISCOUNT_TYPE[t].label}
              </option>
            ))}
          </select>
        </Field>

        <FormGrid cols={3}>
          {needsQty(type) && (
            <Field label={type === 'BUY_MORE_GET_MORE' ? 'Lleva' : `Desde (${unit})`} required>
              <AffixInput type="number" min={1} step="any" value={qty} onChange={(e) => setQty(e.target.value)} suffix={unit} />
            </Field>
          )}
          {type === 'BUY_MORE_GET_MORE' && (
            <Field label="Paga" required>
              <AffixInput type="number" min={1} step="any" value={toGet} onChange={(e) => setToGet(e.target.value)} suffix={unit} />
            </Field>
          )}
          {needsValue(type) && (
            <Field label={isPercent(type) ? 'Descuento' : `Monto por ${unit}`} required>
              <AffixInput
                type="number"
                min={0}
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                prefix={isPercent(type) ? undefined : '$'}
                suffix={isPercent(type) ? '%' : undefined}
              />
            </Field>
          )}
          <Field label="Stock mínimo" hint="Con menos stock la oferta no aplica.">
            <AffixInput
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              suffix={measure === 'KG' ? 'g' : 'u'}
              placeholder="Opcional"
            />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="Inicio" required>
            <input type="datetime-local" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin" required>
            <input type="datetime-local" className={inputClass} value={finish} onChange={(e) => setFinish(e.target.value)} />
          </Field>
        </FormGrid>

        <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
          <Info className="mt-0.5 w-4 h-4 shrink-0 text-primary" />
          <div>
            <span className="text-muted-foreground">Vista previa: </span>
            <strong className="text-foreground">{preview}</strong>
            {target === 'variant' && variant && <span className="text-muted-foreground"> en {variantLabel(variant)}</span>}
            {target === 'product' && productName && <span className="text-muted-foreground"> en todas las variantes de {productName}</span>}
          </div>
        </div>
      </form>
    </Modal>
  );
}
