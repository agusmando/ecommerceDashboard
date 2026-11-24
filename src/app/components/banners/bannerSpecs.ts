import { useMemo } from 'react';
import { useBannerPlacementsQuery } from '../../api/resources';
import {
  BANNER_PLACEMENTS,
  type BannerPlacement,
  type BannerPlacementSpec,
  type BannerSize,
  type Dimensions,
} from '../../api/types';
import { BANNER_PLACEMENT_LABEL } from '../../lib/domain';

/** Respaldo (espejo del contrato) mientras `GET /banner/placements` carga o si falla. */
const FALLBACK: Record<BannerPlacement, BannerPlacementSpec> = {
  HOME_HERO: {
    key: 'HOME_HERO',
    label: BANNER_PLACEMENT_LABEL.HOME_HERO,
    description: 'Carrusel principal de la portada. Sin imagen se muestra el degradé con el texto.',
    desktop: { width: 1920, height: 600 },
    mobile: { width: 800, height: 800 },
    imageRequired: false,
    textRequired: false,
    maxActive: null,
  },
  HOME_RECOMMENDATION: {
    key: 'HOME_RECOMMENDATION',
    label: BANNER_PLACEMENT_LABEL.HOME_RECOMMENDATION,
    description: 'Las 4 tarjetas de "Nuestras recomendaciones" de la portada: título, subtítulo, imagen y link. Las posiciones sin tarjeta muestran la imagen por defecto.',
    desktop: null,
    mobile: null,
    sizes: { SQUARE: { width: 600, height: 600 }, WIDE: { width: 1200, height: 420 } },
    imageRequired: true,
    textRequired: false,
    maxActive: null,
  },
  CATALOG_STRIP: {
    key: 'CATALOG_STRIP',
    label: BANNER_PLACEMENT_LABEL.CATALOG_STRIP,
    description: 'Franja angosta arriba de /productos y /ofertas.',
    desktop: { width: 1600, height: 300 },
    mobile: { width: 800, height: 300 },
    imageRequired: true,
    textRequired: false,
    maxActive: null,
  },
  ANNOUNCEMENT_BAR: {
    key: 'ANNOUNCEMENT_BAR',
    label: BANNER_PLACEMENT_LABEL.ANNOUNCEMENT_BAR,
    description: 'Barra de texto en la parte superior de la web. Se muestra solo la primera vigente.',
    desktop: null,
    mobile: null,
    imageRequired: false,
    textRequired: true,
    maxActive: 1,
  },
};

/** Especificaciones por ubicación (del backend, con respaldo local). */
export function usePlacementSpecs() {
  const q = useBannerPlacementsQuery();
  const specs = useMemo(() => {
    const map = { ...FALLBACK };
    q.data?.forEach((s) => {
      map[s.key] = s;
    });
    return map;
  }, [q.data]);
  const order = useMemo<BannerPlacement[]>(() => {
    const fromApi = q.data?.map((s) => s.key) ?? [];
    return [...fromApi, ...BANNER_PLACEMENTS.filter((k) => !fromApi.includes(k))];
  }, [q.data]);
  return { specs, order, isLoading: q.isLoading };
}

/** Qué campos usa cada ubicación en el formulario. */
export const PLACEMENT_FIELDS: Record<
  BannerPlacement,
  { copy: ('eyebrow' | 'headline' | 'text' | 'ctaLabel')[]; colors: boolean; desktop: boolean; mobile: boolean; size: boolean }
> = {
  HOME_HERO: { copy: ['eyebrow', 'headline', 'text', 'ctaLabel'], colors: true, desktop: true, mobile: true, size: false },
  HOME_RECOMMENDATION: { copy: ['headline', 'text'], colors: false, desktop: true, mobile: false, size: true },
  CATALOG_STRIP: { copy: [], colors: false, desktop: true, mobile: true, size: false },
  ANNOUNCEMENT_BAR: { copy: ['text'], colors: true, desktop: false, mobile: false, size: false },
};

/** Medidas recomendadas para la imagen de escritorio/móvil. */
export function recommendedSize(spec: BannerPlacementSpec, device: 'desktop' | 'mobile', size?: BannerSize | null): Dimensions | null {
  if (spec.sizes) return spec.sizes[size ?? 'SQUARE'] ?? null;
  return device === 'mobile' ? spec.mobile ?? spec.desktop : spec.desktop;
}

export const formatDims = (d: Dimensions) => `${d.width} × ${d.height} px`;

/** Avisos (no bloqueantes) si la imagen elegida no coincide con la recomendada. */
export function dimensionWarnings(actual: Dimensions, rec: Dimensions): string[] {
  const out: string[] = [];
  const ar = actual.width / actual.height;
  const rar = rec.width / rec.height;
  if (Math.abs(ar - rar) / rar > 0.1) {
    out.push(
      `La proporción de la imagen (${formatDims(actual)}) es distinta de la recomendada (${formatDims(rec)}): la web la va a recortar.`,
    );
  }
  if (actual.width < rec.width * 0.75) {
    out.push(`La imagen es más chica que lo recomendado (${rec.width} px de ancho): puede verse pixelada.`);
  }
  return out;
}
