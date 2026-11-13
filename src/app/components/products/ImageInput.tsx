import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

/** Selector de imágenes con miniaturas. */
export function ImageInput({
  files,
  onChange,
  max = 7,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <div key={u} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
          <img src={u} alt={files[i].name} className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Quitar imagen"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {files.length < max && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary"
        >
          <ImagePlus className="w-5 h-5" />
          Agregar
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          onChange([...files, ...picked].slice(0, max));
          e.target.value = '';
        }}
      />
    </div>
  );
}
