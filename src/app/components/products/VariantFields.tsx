import { MEASURES, type Measure, type VariantInput } from '../../api/types';
import { computeFinalPrice, priceUnit } from '../../lib/domain';
import { formatCurrency } from '../../lib/utils';
import { AffixInput, Field, FormGrid, inputClass, num, parseNumberList, SwitchRow } from '../Form';

/** Borrador de variante: todos los campos como string para los inputs. */
export interface VariantDraft {
  name: string;
  price: string;
  marginPct: string;
  roundingOption: string;
  contentMeasure: Measure;
  packaging: string;
  currentStock: string;
  stockThreshold: string;
  requestTime: string;
  availableWeb: boolean;
}

export const emptyVariant = (measure: Measure = 'KG', name = ''): VariantDraft => ({
  name,
  price: '',
  marginPct: '50',
  roundingOption: '10',
  contentMeasure: measure,
  packaging: '',
  currentStock: '',
  stockThreshold: '',
  requestTime: '',
  availableWeb: true,
});

export type VariantErrors = Partial<Record<keyof VariantDraft, string>>;

export function validateVariant(d: VariantDraft, { requirePrice = true } = {}): VariantErrors {
  const e: VariantErrors = {};
  if (!d.name.trim()) e.name = 'Ingresá un nombre';
  if (requirePrice && !(Number(d.price) > 0)) e.price = 'El costo debe ser mayor a 0';
  if (d.marginPct.trim() && !(Number(d.marginPct) >= 0)) e.marginPct = 'Margen inválido';
  if (d.currentStock.trim() && !(Number(d.currentStock) >= 0)) e.currentStock = 'Stock inválido';
  if (d.stockThreshold.trim() && !(Number(d.stockThreshold) >= 0)) e.stockThreshold = 'Valor inválido';
  if (d.requestTime.trim() && !(Number(d.requestTime) >= 0)) e.requestTime = 'Días inválidos';
  return e;
}

export function draftToInput(d: VariantDraft): VariantInput {
  return {
    name: d.name.trim(),
    price: Number(d.price) || 0,
    profitMargin: (num(d.marginPct) ?? 0) / 100,
    roundingOption: Number(d.roundingOption) || 10,
    contentMeasure: d.contentMeasure,
    packagingOptions: parseNumberList(d.packaging),
    currentStock: num(d.currentStock) ?? 0,
    stockThreshold: num(d.stockThreshold) ?? 0,
    requestTime: d.requestTime.trim(),
    availableWeb: d.availableWeb,
  };
}

export const ROUNDING_OPTIONS = [
  { value: '1', label: 'Sin redondeo' },
  { value: '10', label: 'A la decena' },
  { value: '100', label: 'A la centena' },
];

const stockUnit = (m: Measure) => (m === 'KG' ? 'g' : m.toLowerCase());

/** Campos de una variante simple (alta de producto o nueva variante). */
export function VariantFields({
  draft,
  onChange,
  errors = {},
  hidePricing = false,
}: {
  draft: VariantDraft;
  onChange: (patch: Partial<VariantDraft>) => void;
  errors?: VariantErrors;
  /** Para mixes: el precio lo calcula el backend. */
  hidePricing?: boolean;
}) {
  const final = computeFinalPrice(Number(draft.price) || 0, (Number(draft.marginPct) || 0) / 100, Number(draft.roundingOption));
  const unit = stockUnit(draft.contentMeasure);

  return (
    <div className="space-y-4">
      <FormGrid>
        <Field label="Nombre" required error={errors.name}>
          <input className={inputClass} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej. Almendra natural" />
        </Field>
        <Field label="Unidad de contenido" hint={draft.contentMeasure === 'KG' ? 'Precio por kg, stock en gramos' : undefined}>
          <select className={inputClass} value={draft.contentMeasure} onChange={(e) => onChange({ contentMeasure: e.target.value as Measure })}>
            {MEASURES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
      </FormGrid>

      {!hidePricing && (
        <>
          <FormGrid cols={3}>
            <Field label={`Costo ${priceUnit(draft.contentMeasure)}`} required error={errors.price}>
              <AffixInput prefix="$" type="number" min={0} step="any" value={draft.price} onChange={(e) => onChange({ price: e.target.value })} />
            </Field>
            <Field label="Margen" error={errors.marginPct}>
              <AffixInput suffix="%" type="number" min={0} step="any" value={draft.marginPct} onChange={(e) => onChange({ marginPct: e.target.value })} />
            </Field>
            <Field label="Redondeo">
              <select className={inputClass} value={draft.roundingOption} onChange={(e) => onChange({ roundingOption: e.target.value })}>
                {ROUNDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Precio de venta</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(final)}
              <span className="text-xs font-normal text-muted-foreground">{priceUnit(draft.contentMeasure)}</span>
            </span>
          </div>
        </>
      )}

      <FormGrid cols={3}>
        <Field label="Stock inicial" hint={`En ${unit}. Se registra como ingreso.`} error={errors.currentStock}>
          <AffixInput suffix={unit} type="number" min={0} value={draft.currentStock} onChange={(e) => onChange({ currentStock: e.target.value })} />
        </Field>
        <Field label="Umbral de stock" hint="Debajo de esto no aplican ofertas" error={errors.stockThreshold}>
          <AffixInput suffix={unit} type="number" min={0} value={draft.stockThreshold} onChange={(e) => onChange({ stockThreshold: e.target.value })} />
        </Field>
        <Field label="Demora" hint="Días para tener el producto" error={errors.requestTime}>
          <AffixInput suffix="días" type="number" min={0} value={draft.requestTime} onChange={(e) => onChange({ requestTime: e.target.value })} />
        </Field>
      </FormGrid>

      <Field label="Presentaciones" hint={`Tamaños de paquete en ${unit}, separados por coma (ej. 250, 500, 1000). Vacío = venta suelta.`}>
        <input className={inputClass} value={draft.packaging} onChange={(e) => onChange({ packaging: e.target.value })} placeholder="250, 500, 1000" />
      </Field>

      <SwitchRow label="Disponible en la web"
          description="Oculta esta variante en la tienda. Si ninguna variante queda visible, el producto deja de aparecer." checked={draft.availableWeb} onChange={(v) => onChange({ availableWeb: v })} />
    </div>
  );
}
