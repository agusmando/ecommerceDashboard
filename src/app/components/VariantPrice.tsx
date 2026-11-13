import type { Measure, ProductVariant } from '../api/types';
import { priceUnit } from '../lib/domain';
import { cn, formatCurrency } from '../lib/utils';

/** Etiqueta verde con la oferta vigente ("20% off", "3x2"…). */
export function OfferTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        className,
      )}
    >
      {label}
    </span>
  );
}

/**
 * Precio de venta de una variante con su oferta vigente: si la oferta baja el
 * precio unitario se muestra el precio con descuento y el de lista tachado;
 * si depende de la cantidad (3x2, desde N) se muestra solo la etiqueta.
 */
export function VariantPrice({
  variant,
  measure,
  align = 'end',
}: {
  variant: Pick<ProductVariant, 'finalPrice' | 'offerPrice' | 'activeOffer' | 'contentMeasure'>;
  measure?: Measure | string | null;
  align?: 'start' | 'end';
}) {
  const m = measure ?? variant.contentMeasure;
  const discounted = variant.offerPrice != null && variant.offerPrice < (variant.finalPrice ?? 0);
  return (
    <span className={cn('inline-flex flex-col gap-0.5', align === 'end' ? 'items-end' : 'items-start')}>
      <span className={cn('font-medium tabular-nums', discounted && 'text-emerald-700 dark:text-emerald-400')}>
        {formatCurrency(discounted ? variant.offerPrice : variant.finalPrice)}
        <span className="text-xs font-normal text-muted-foreground">{priceUnit(m)}</span>
      </span>
      {discounted && <span className="text-xs text-muted-foreground line-through tabular-nums">{formatCurrency(variant.finalPrice)}</span>}
      {variant.activeOffer && <OfferTag label={variant.activeOffer.label} />}
    </span>
  );
}
