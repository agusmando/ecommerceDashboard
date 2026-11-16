/**
 * Transformaciones de Cloudinary sobre las URLs que guarda el backend
 * (`https://res.cloudinary.com/<cloud>/image/upload/v123/products/abc.jpg`).
 *
 * `cld()` inserta `f_auto,q_auto,w_<w>[,h_<h>,c_<crop>]` justo después de `/upload/`:
 * formato moderno (AVIF/WebP) y compresión automática, al tamaño en que se muestra.
 * Cualquier otra URL (assets locales, otros hosts) se devuelve tal cual, y si la URL ya
 * trae una transformación no se agrega otra.
 *
 * Copia de `canelaEnRamaWeb/src/app/lib/cloudinary.ts` (mantener sincronizadas).
 */

export type CldCrop = 'fill' | 'limit' | 'fit' | 'pad' | 'thumb' | 'scale';

export interface CldOptions {
  /** Ancho en px. */
  w: number;
  /** Alto en px (opcional). */
  h?: number;
  /** Recorte. Por defecto `fill` si hay alto, `limit` (nunca agranda) si no. */
  crop?: CldCrop;
  /** Gravedad del recorte, p. ej. `auto` o `center`. */
  gravity?: string;
}

const UPLOAD_SEGMENT = '/image/upload/';
const CLOUDINARY_HOST = /^https?:\/\/res\.cloudinary\.com\//i;
/** Un componente de transformación: `w_400`, `c_fill`, `f_auto`, `e_sharpen:100`… */
const TRANSFORM_PART = /^(a|ac|af|ar|b|bl|bo|br|c|co|cs|d|dl|dn|dpr|du|e|eo|f|fl|fn|fps|g|h|if|ki|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z|\$[a-z0-9]+)_[^/]*$/i;

const isTransformSegment = (segment: string) => segment.split(',').every((part) => TRANSFORM_PART.test(part));

export const isCloudinaryUrl = (url: string | null | undefined): url is string =>
  !!url && CLOUDINARY_HOST.test(url) && url.includes(UPLOAD_SEGMENT);

/** Devuelve la URL de Cloudinary con la transformación; cualquier otra URL, sin cambios. */
export function cld<T extends string | null | undefined>(url: T, opts: CldOptions): T {
  if (!isCloudinaryUrl(url)) return url;
  const at = url.indexOf(UPLOAD_SEGMENT) + UPLOAD_SEGMENT.length;
  const rest = url.slice(at);
  const first = rest.split('/')[0];
  // Ya tiene transformación (o es una URL rara): no tocar.
  if (!first || isTransformSegment(first)) return url;

  const w = Math.max(1, Math.round(opts.w));
  const h = opts.h ? Math.max(1, Math.round(opts.h)) : undefined;
  const crop = opts.crop ?? (h ? 'fill' : 'limit');
  const parts = ['f_auto', 'q_auto', `c_${crop}`, `w_${w}`];
  if (h) parts.push(`h_${h}`);
  if (opts.gravity && crop !== 'limit' && crop !== 'scale' && crop !== 'fit') parts.push(`g_${opts.gravity}`);
  return (url.slice(0, at) + parts.join(',') + '/' + rest) as T;
}

/**
 * `srcset` con un ancho por candidato. Si se pasa `aspect` (ancho / alto) cada
 * candidato se recorta a esa proporción. `undefined` si la URL no es de Cloudinary.
 */
export function cldSrcSet(
  url: string | null | undefined,
  widths: number[],
  opts: { aspect?: number; crop?: CldCrop; gravity?: string } = {},
): string | undefined {
  if (!isCloudinaryUrl(url)) return undefined;
  return widths
    .map((w) => {
      const h = opts.aspect ? Math.round(w / opts.aspect) : undefined;
      return `${cld(url, { w, h, crop: opts.crop, gravity: opts.gravity })} ${w}w`;
    })
    .join(', ');
}

/**
 * Props listas para un `<img>`: `src` al ancho por defecto + `srcSet`/`sizes` si es de Cloudinary.
 * Para URLs que no son de Cloudinary devuelve solo `src`.
 */
export function cldImg(
  url: string,
  opts: { widths: number[]; sizes: string; aspect?: number; crop?: CldCrop; gravity?: string; w?: number },
): { src: string; srcSet?: string; sizes?: string } {
  if (!isCloudinaryUrl(url)) return { src: url };
  const w = opts.w ?? opts.widths[Math.min(1, opts.widths.length - 1)];
  const h = opts.aspect ? Math.round(w / opts.aspect) : undefined;
  return {
    src: cld(url, { w, h, crop: opts.crop, gravity: opts.gravity }),
    srcSet: cldSrcSet(url, opts.widths, opts),
    sizes: opts.sizes,
  };
}
