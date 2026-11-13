import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Trash2, Undo2 } from 'lucide-react';
import type { Dimensions } from '../../api/types';
import { cn } from '../../lib/utils';
import { Button } from '../Button';
import { dimensionWarnings, formatDims } from './bannerSpecs';

export interface ImageSlot {
  file: File | null;
  /** Marcar la imagen actual para borrarla. */
  removed: boolean;
}

export const EMPTY_SLOT: ImageSlot = { file: null, removed: false };

/** URL visible del slot: archivo nuevo > imagen actual (si no se quitó). */
export function useSlotUrl(slot: ImageSlot, existingUrl: string | null | undefined) {
  const objectUrl = useMemo(() => (slot.file ? URL.createObjectURL(slot.file) : null), [slot.file]);
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);
  return objectUrl ?? (!slot.removed ? existingUrl ?? null : null);
}

interface Props {
  label: string;
  hint?: string;
  required?: boolean;
  recommended: Dimensions | null;
  existingUrl: string | null | undefined;
  /** URL a mostrar (de `useSlotUrl`, compartida con la vista previa). */
  url: string | null;
  slot: ImageSlot;
  onChange: (slot: ImageSlot) => void;
  /** Proporción de la miniatura (ancho/alto). */
  aspect?: number;
}

/** Imagen de banner: medida recomendada, vista previa y aviso si la proporción no coincide. */
export function BannerImageField({ label, hint, required, recommended, existingUrl, url, slot, onChange, aspect }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dims, setDims] = useState<Dimensions | null>(null);

  // Medidas reales del archivo elegido (solo se avisa sobre archivos nuevos).
  useEffect(() => {
    setDims(null);
    if (!slot.file || !url) return;
    const img = new Image();
    img.onload = () => setDims({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
  }, [slot.file, url]);

  const warnings = dims && recommended ? dimensionWarnings(dims, recommended) : [];
  const ratio = aspect ?? (recommended ? recommended.width / recommended.height : 16 / 9);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span id={id} className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {recommended && <span className="text-xs text-muted-foreground">Recomendado: {formatDims(recommended)}</span>}
      </div>

      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          'group relative block w-full overflow-hidden rounded-lg border bg-muted/40 transition-colors',
          url ? 'border-border' : 'border-dashed border-border hover:border-primary',
        )}
        style={{ aspectRatio: String(Math.min(Math.max(ratio, 0.6), 6)) }}
        aria-describedby={id}
        aria-label={url ? `Cambiar ${label.toLowerCase()}` : `Elegir ${label.toLowerCase()}`}
      >
        {url ? (
          <>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              Cambiar imagen
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground group-hover:text-primary">
            <ImagePlus className="w-5 h-5" />
            {slot.removed ? 'Imagen quitada · elegir otra' : 'Elegir imagen'}
          </span>
        )}
      </button>

      <div className="flex flex-wrap items-center gap-2">
        {slot.file && (
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={slot.file.name}>
            {slot.file.name}
            {dims && ` · ${formatDims(dims)}`}
          </span>
        )}
        {slot.file && (
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...slot, file: null })}>
            <Undo2 className="w-4 h-4" /> Descartar
          </Button>
        )}
        {!slot.file && existingUrl && !slot.removed && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onChange({ file: null, removed: true })}>
            <Trash2 className="w-4 h-4" /> Quitar imagen
          </Button>
        )}
        {!slot.file && existingUrl && slot.removed && (
          <Button size="sm" variant="ghost" onClick={() => onChange({ file: null, removed: false })}>
            <Undo2 className="w-4 h-4" /> Restaurar
          </Button>
        )}
      </div>

      {warnings.map((w) => (
        <p key={w} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 w-3.5 h-3.5 shrink-0" />
          {w}
        </p>
      ))}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange({ file: f, removed: slot.removed });
          e.target.value = '';
        }}
      />
    </div>
  );
}
