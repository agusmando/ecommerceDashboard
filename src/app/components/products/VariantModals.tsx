import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Minus, Plus, Trash2, Undo2 } from 'lucide-react';
import { useUpdateVariantMutation, variantsApi, useAdjustVariantStockMutation } from '../../api/resources';
import type { Id, ProductVariant, UpdateVariantInput } from '../../api/types';
import { computeFinalPrice, formatPack, formatQty, fromLocalChoice, isMix, priceUnit, toLocalChoice, type LocalChoice } from '../../lib/domain';
import { cn, formatCurrency } from '../../lib/utils';
import { useAction } from '../../hooks/useAction';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { AffixInput, Field, FormGrid, inputClass, num, parseNumberList, SwitchRow } from '../Form';
import { Segmented } from '../Filters';
import { Skeleton } from '../States';
import { VariantPicker, variantLabel } from '../CatalogPickers';
import { ImageInput } from './ImageInput';
import { LocalSelect, ROUNDING_OPTIONS } from './VariantFields';
import { cld } from '../../lib/cloudinary';

export type VariantModalKind = 'price' | 'stock' | 'availability' | 'recipe' | 'images';

interface ModalProps {
  variant: ProductVariant;
  isOpen: boolean;
  onClose: () => void;
}

const stockUnit = (v: ProductVariant) => (v.contentMeasure === 'KG' ? 'g' : v.contentMeasure.toLowerCase());

/** Mutación + toasts + cierre: patrón común de todos los modales. */
function useVariantSave(variant: ProductVariant, success: string, onClose: () => void) {
  const [update] = useUpdateVariantMutation();
  const [run, busy] = useAction((body: UpdateVariantInput) => update({ id: variant.id, body }).unwrap(), {
    success,
    error: 'No se pudo actualizar la variante',
  });
  const save = (body: UpdateVariantInput) => run(body).then(onClose).catch(() => undefined);
  return [save, busy] as const;
}

function Shell({
  title,
  description,
  isOpen,
  onClose,
  busy,
  onSubmit,
  submitLabel = 'Guardar',
  disabled,
  children,
  size,
}: {
  title: string;
  description?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  busy: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={typeof description === 'string' ? description : undefined}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={busy} disabled={disabled}>
            {submitLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

// ---------------------------------------------------------------- Precio

export function PriceModal({ variant, isOpen, onClose }: ModalProps) {
  const [price, setPrice] = useState('');
  const [margin, setMargin] = useState('');
  const [rounding, setRounding] = useState('10');
  const [save, busy] = useVariantSave(variant, 'Precio actualizado', onClose);
  const mix = isMix(variant);

  useEffect(() => {
    if (!isOpen) return;
    setPrice(String(variant.price ?? ''));
    setMargin(String(Math.round((variant.profitMargin ?? 0) * 10000) / 100));
    setRounding(String(variant.roundingOption ?? 10));
  }, [isOpen, variant]);

  const next = computeFinalPrice(Number(price) || 0, (Number(margin) || 0) / 100, Number(rounding));
  const valid = mix || Number(price) > 0;

  return (
    <Shell
      title={`Precio · ${variant.name}`}
      description="Recalcula en cascada el precio de los mixes que usan esta variante."
      isOpen={isOpen}
      onClose={onClose}
      busy={busy}
      disabled={!valid}
      onSubmit={() =>
        save(
          mix
            ? { roundingOption: Number(rounding) }
            : { price: Number(price), profitMargin: (num(margin) ?? 0) / 100, roundingOption: Number(rounding) },
        )
      }
    >
      <div className="space-y-4">
        {mix && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Es un mix: su costo se calcula a partir de la receta. Solo podés cambiar el redondeo.
          </p>
        )}
        <FormGrid cols={3}>
          <Field label={`Costo ${priceUnit(variant.contentMeasure)}`}>
            <AffixInput prefix="$" type="number" min={0} step="any" value={price} disabled={mix} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Margen">
            <AffixInput suffix="%" type="number" min={0} step="any" value={margin} disabled={mix} onChange={(e) => setMargin(e.target.value)} />
          </Field>
          <Field label="Redondeo">
            <select className={inputClass} value={rounding} onChange={(e) => setRounding(e.target.value)}>
              {ROUNDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </FormGrid>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-primary/5 p-3 text-sm">
          <div>
            <div className="text-muted-foreground">Precio actual</div>
            <div className="font-semibold tabular-nums">{formatCurrency(variant.finalPrice)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Precio nuevo</div>
            <div className="font-semibold tabular-nums text-primary">
              {mix ? '—' : formatCurrency(next)}
              <span className="text-xs font-normal text-muted-foreground">{priceUnit(variant.contentMeasure)}</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- Stock

export function StockModal({ variant, isOpen, onClose }: ModalProps) {
  const [mode, setMode] = useState<'delta' | 'absolute'>('delta');
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState('');
  const [absolute, setAbsolute] = useState('');
  const [adjust] = useAdjustVariantStockMutation();
  const [run, busy] = useAction(
    (body: { currentStock: number } | { stockIncrement: number }) => adjust({ id: variant.id, body }).unwrap(),
    { success: 'Stock actualizado', error: 'No se pudo actualizar el stock' },
  );
  const save = (body: { currentStock: number } | { stockIncrement: number }) => run(body).then(onClose).catch(() => undefined);
  const mix = isMix(variant);
  const unit = stockUnit(variant);

  useEffect(() => {
    if (!isOpen) return;
    setMode('delta');
    setSign('+');
    setAmount('');
    setAbsolute(String(variant.currentStock));
  }, [isOpen, variant]);

  const delta = (Number(amount) || 0) * (sign === '+' ? 1 : -1);
  const result = mode === 'delta' ? variant.currentStock + delta : Number(absolute) || 0;
  const valid = mode === 'delta' ? Number(amount) > 0 && result >= 0 : absolute.trim() !== '' && Number(absolute) >= 0;

  return (
    <Shell
      title={`Stock · ${variant.name}`}
      isOpen={isOpen}
      onClose={onClose}
      busy={busy}
      disabled={!valid}
      submitLabel={mode === 'delta' && mix && sign === '+' ? 'Producir' : 'Guardar'}
      onSubmit={() => save(mode === 'delta' ? { stockIncrement: delta } : { currentStock: Number(absolute) })}
    >
      <div className="space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'delta', label: 'Sumar / restar' },
            { value: 'absolute', label: 'Fijar inventario' },
          ]}
        />
        {mode === 'delta' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="inline-flex rounded-lg border border-border p-0.5">
                {(['+', '-'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSign(s)}
                    aria-label={s === '+' ? 'Sumar' : 'Restar'}
                    className={cn(
                      'flex h-9 w-10 items-center justify-center rounded-md',
                      sign === s ? (s === '+' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {s === '+' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              <div className="flex-1">
                <AffixInput suffix={unit} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="Cantidad" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sign === '+'
                ? mix
                  ? 'En un mix, sumar produce: descuenta los componentes según la receta (movimientos PRODUCTION).'
                  : 'Se registra un movimiento de ingreso (IN).'
                : 'Se registra una salida (OUT). Si no alcanza el stock, el backend rechaza la operación.'}
            </p>
          </div>
        ) : (
          <Field label="Stock contado" hint="Valor absoluto: se registra un ajuste (ADJUSTMENT) por la diferencia.">
            <AffixInput suffix={unit} type="number" min={0} value={absolute} onChange={(e) => setAbsolute(e.target.value)} autoFocus />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <div className="text-muted-foreground">Stock actual</div>
            <div className="font-semibold tabular-nums">{formatQty(variant.currentStock, variant.contentMeasure)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Stock resultante</div>
            <div className={cn('font-semibold tabular-nums', result < 0 ? 'text-destructive' : 'text-primary')}>
              {formatQty(result, variant.contentMeasure)}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- Disponibilidad

export function AvailabilityModal({ variant, isOpen, onClose }: ModalProps) {
  const [web, setWeb] = useState(true);
  const [packaging, setPackaging] = useState('');
  const [threshold, setThreshold] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [local, setLocal] = useState<LocalChoice>('');
  const [save, busy] = useVariantSave(variant, 'Disponibilidad actualizada', onClose);
  // Valor del producto: viene incluido o, si la variante hereda, es el que resolvió el API
  const productIsLocal = variant.product?.isLocal ?? (variant.isLocal == null ? variant.local : undefined);
  const unit = stockUnit(variant);

  useEffect(() => {
    if (!isOpen) return;
    setWeb(variant.availableWeb);
    setPackaging((variant.packagingOptions ?? []).join(', '));
    setThreshold(String(variant.stockThreshold ?? 0));
    setRequestTime(variant.requestTime ?? '');
    setLocal(toLocalChoice(variant.isLocal));
  }, [isOpen, variant]);

  return (
    <Shell
      title={`Disponibilidad · ${variant.name}`}
      isOpen={isOpen}
      onClose={onClose}
      busy={busy}
      onSubmit={() =>
        save({
          availableWeb: web,
          packagingOptions: parseNumberList(packaging),
          stockThreshold: num(threshold) ?? 0,
          requestTime: requestTime.trim(),
          isLocal: fromLocalChoice(local),
        })
      }
    >
      <div className="space-y-4">
        <SwitchRow label="Disponible en la web"
          description="Oculta esta variante en la tienda. Si ninguna variante queda visible, el producto deja de aparecer." checked={web} onChange={setWeb} />
        <LocalSelect value={local} onChange={setLocal} productIsLocal={productIsLocal} />
        <Field label="Presentaciones" hint={`Tamaños en ${unit}, separados por coma. Vacío = venta suelta.`}>
          <input className={inputClass} value={packaging} onChange={(e) => setPackaging(e.target.value)} placeholder="250, 500, 1000" />
        </Field>
        <FormGrid>
          <Field label="Umbral de stock" hint="Por debajo no aplican ofertas">
            <AffixInput suffix={unit} type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
          <Field label="Demora" hint="Setea la fecha estimada en las órdenes">
            <AffixInput suffix="días" type="number" min={0} value={requestTime} onChange={(e) => setRequestTime(e.target.value)} />
          </Field>
        </FormGrid>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- Receta

interface RecipeLine {
  productVariantId: Id;
  label: string;
  measure?: string;
  quantity: string;
  original?: number;
  removed?: boolean;
}

export function RecipeModal({ variant, isOpen, onClose }: ModalProps) {
  const { data: full, isLoading } = variantsApi.useOne(isOpen ? variant.id : null, { refetchOnMountOrArgChange: true });
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [pick, setPick] = useState<{ id: Id; v?: ProductVariant } | null>(null);
  const [pickQty, setPickQty] = useState('');
  const [save, busy] = useVariantSave(variant, 'Receta actualizada', onClose);

  useEffect(() => {
    if (!isOpen || !full) return;
    setLines(
      (full.hasComponents ?? [])
        .filter((d) => d.active !== false)
        .map((d) => ({
          productVariantId: d.productVariantId,
          label: d.componentProduct ? variantLabel(d.componentProduct) : `Variante #${d.productVariantId}`,
          measure: d.componentProduct?.contentMeasure,
          quantity: String(d.quantity),
          original: d.quantity,
        })),
    );
    setPick(null);
    setPickQty('');
  }, [isOpen, full]);

  const diff = useMemo(() => {
    const add = lines.filter((l) => l.original === undefined && !l.removed);
    const edit = lines.filter((l) => l.original !== undefined && !l.removed && Number(l.quantity) !== l.original);
    const remove = lines.filter((l) => l.original !== undefined && l.removed);
    return {
      addComponents: add.map((l) => ({ productVariantId: l.productVariantId, quantity: Number(l.quantity) })),
      editComponents: edit.map((l) => ({ productVariantId: l.productVariantId, quantity: Number(l.quantity) })),
      removeComponents: remove.map((l) => ({ productVariantId: l.productVariantId })),
    };
  }, [lines]);

  const changed = diff.addComponents.length + diff.editComponents.length + diff.removeComponents.length > 0;
  const valid = lines.filter((l) => !l.removed).every((l) => Number(l.quantity) > 0) && lines.some((l) => !l.removed);

  const addLine = () => {
    if (!pick || !(Number(pickQty) > 0)) return;
    setLines((ls) => [
      ...ls.filter((l) => l.productVariantId !== pick.id || l.original !== undefined),
      {
        productVariantId: pick.id,
        label: pick.v ? variantLabel(pick.v) : `Variante #${pick.id}`,
        measure: pick.v?.contentMeasure,
        quantity: pickQty,
      },
    ]);
    setPick(null);
    setPickQty('');
  };

  const patch = (i: number, p: Partial<RecipeLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <Shell
      title={`Receta · ${variant.name}`}
      description="Cantidades por cada kg/unidad del mix. Recalcula el precio del mix."
      isOpen={isOpen}
      onClose={onClose}
      busy={busy}
      size="lg"
      disabled={!changed || !valid}
      onSubmit={() =>
        save({
          ...(diff.addComponents.length ? { addComponents: diff.addComponents } : {}),
          ...(diff.editComponents.length ? { editComponents: diff.editComponents } : {}),
          ...(diff.removeComponents.length ? { removeComponents: diff.removeComponents } : {}),
        })
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lines.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Sin componentes</li>}
            {lines.map((l, i) => (
              <li key={`${l.productVariantId}-${i}`} className={cn('flex items-center gap-3 px-3 py-2', l.removed && 'opacity-50')}>
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm', l.removed && 'line-through')}>{l.label}</div>
                  {l.original === undefined && <div className="text-xs text-emerald-600">Nuevo</div>}
                </div>
                <div className="w-24 shrink-0 sm:w-32">
                  <AffixInput
                    suffix={l.measure === 'KG' ? 'g' : 'u'}
                    type="number"
                    min={0}
                    value={l.quantity}
                    disabled={l.removed}
                    onChange={(e) => patch(i, { quantity: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={l.removed ? 'Restaurar' : 'Quitar'}
                  onClick={() =>
                    l.original === undefined ? setLines((ls) => ls.filter((_, j) => j !== i)) : patch(i, { removed: !l.removed })
                  }
                >
                  {l.removed ? <Undo2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="mb-2 text-sm font-medium">Agregar componente</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <VariantPicker
                  value={pick?.id}
                  onChange={(id, v) => setPick(id ? { id, v } : null)}
                  exclude={[variant.id, ...lines.filter((l) => !l.removed).map((l) => l.productVariantId)]}
                />
              </div>
              <div className="w-full sm:w-32">
                <AffixInput
                  suffix={pick?.v?.contentMeasure === 'KG' ? 'g' : 'u'}
                  type="number"
                  min={0}
                  placeholder="Cant."
                  value={pickQty}
                  onChange={(e) => setPickQty(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={addLine} disabled={!pick || !(Number(pickQty) > 0)}>
                <Plus className="w-4 h-4" /> Agregar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------- Imágenes

export function ImagesModal({ variant, isOpen, onClose }: ModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<Id[]>([]);
  const [save, busy] = useVariantSave(variant, 'Imágenes actualizadas', onClose);
  const images = variant.images ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setFiles([]);
    setRemoved([]);
  }, [isOpen]);

  const toggle = (id: Id) => setRemoved((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  return (
    <Shell
      title={`Imágenes · ${variant.name}`}
      isOpen={isOpen}
      onClose={onClose}
      busy={busy}
      size="lg"
      disabled={!files.length && !removed.length}
      onSubmit={() => save({ images: files, removeImages: removed.map((id) => ({ id })) })}
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-sm font-medium">Actuales</div>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">La variante no tiene imágenes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {images.map((img) => {
                const off = removed.includes(img.id);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => toggle(img.id)}
                    title={off ? 'Restaurar' : 'Quitar'}
                    className={cn(
                      'relative h-24 w-24 overflow-hidden rounded-lg border-2',
                      off ? 'border-destructive opacity-40' : 'border-border hover:border-destructive',
                    )}
                  >
                    <img src={cld(img.secure_url, { w: 240, h: 240 })} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    {off && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-destructive" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {images.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Tocá una imagen para marcarla para borrar.</p>}
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Agregar</div>
          <ImageInput files={files} onChange={setFiles} />
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- Host

/** Un solo lugar para abrir cualquiera de los modales de variante. */
export function useVariantModals() {
  const [state, setState] = useState<{ kind: VariantModalKind; variant: ProductVariant } | null>(null);
  const [open, setOpen] = useState(false);

  const show = (kind: VariantModalKind, variant: ProductVariant) => {
    setState({ kind, variant });
    setOpen(true);
  };
  const close = () => setOpen(false);

  let element: ReactNode = null;
  if (state) {
    const props = { variant: state.variant, isOpen: open, onClose: close };
    element = {
      price: <PriceModal {...props} />,
      stock: <StockModal {...props} />,
      availability: <AvailabilityModal {...props} />,
      recipe: <RecipeModal {...props} />,
      images: <ImagesModal {...props} />,
    }[state.kind];
  }
  return { show, element };
}

export function PackagingChips({ variant }: { variant: ProductVariant }) {
  const opts = variant.packagingOptions ?? [];
  if (!opts.length) return <span className="text-xs text-muted-foreground">Suelto</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map((p) => (
        <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
          {formatPack(p, variant.contentMeasure)}
        </span>
      ))}
    </div>
  );
}
