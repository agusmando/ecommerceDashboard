import type { BannerPlacement, Dimensions } from '../../api/types';
import { cn } from '../../lib/utils';
import { cld } from '../../lib/cloudinary';

export interface PreviewContent {
  eyebrow?: string;
  headline?: string;
  text?: string;
  ctaLabel?: string;
  backgroundColor?: string;
  textColor?: string;
  name?: string;
}

/**
 * Vista previa aproximada de cómo se verá el banner en la web, en una caja
 * con la proporción de la ubicación.
 */
export function BannerPreview({
  placement,
  dims,
  imageUrl,
  content,
  device,
}: {
  placement: BannerPlacement;
  dims: Dimensions | null;
  imageUrl: string | null;
  content: PreviewContent;
  device: 'desktop' | 'mobile';
}) {
  const { eyebrow, headline, text, ctaLabel, backgroundColor, textColor, name } = content;

  if (placement === 'ANNOUNCEMENT_BAR') {
    return (
      <div
        className="flex min-h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
        style={{ backgroundColor: backgroundColor || undefined, color: textColor || undefined }}
      >
        {text || <span className="opacity-60">Texto del anuncio</span>}
      </div>
    );
  }

  const ratio = dims ? dims.width / dims.height : 16 / 9;
  const showCopy = placement === 'HOME_HERO';

  return (
    <div className={cn('mx-auto w-full', device === 'mobile' && 'max-w-[240px]')}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-border',
          !imageUrl && 'bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 dark:from-amber-900/40 dark:via-orange-900/30 dark:to-rose-900/30',
        )}
        style={{ aspectRatio: String(ratio), backgroundColor: !imageUrl ? backgroundColor || undefined : undefined }}
      >
        {imageUrl ? (
          <img src={cld(imageUrl, { w: 1280 })} alt={name || ''} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          !showCopy && (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Sin imagen</span>
          )
        )}
        {showCopy && (eyebrow || headline || text || ctaLabel) && (
          <div
            className={cn(
              'absolute inset-0 flex flex-col justify-center gap-1 p-[6%]',
              imageUrl && 'bg-gradient-to-r from-black/50 via-black/20 to-transparent',
              device === 'mobile' ? 'items-center text-center' : 'max-w-[60%] items-start',
            )}
            style={{ color: textColor || (imageUrl ? '#fff' : undefined) }}
          >
            {eyebrow && <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90">{eyebrow}</div>}
            {headline && <div className={cn('font-semibold leading-tight', device === 'mobile' ? 'text-sm' : 'text-lg')}>{headline}</div>}
            {text && <div className="line-clamp-2 text-[11px] opacity-90">{text}</div>}
            {ctaLabel && (
              <span className="mt-1 inline-flex rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {ctaLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {dims && (
        <div className="mt-1 text-center text-[11px] text-muted-foreground">
          Proporción de {dims.width} × {dims.height}
        </div>
      )}
    </div>
  );
}
