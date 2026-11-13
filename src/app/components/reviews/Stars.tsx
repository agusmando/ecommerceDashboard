import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Calificación de 1 a 5 estrellas (acepta decimales para promedios). */
export function Stars({ value, size = 'sm', className }: { value: number; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const px = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${v.toLocaleString('es-AR')} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, v - (i - 1)));
        return (
          <span key={i} className={cn('relative inline-block', px)}>
            <Star className={cn('absolute inset-0 text-muted-foreground/30', px)} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn('fill-amber-400 text-amber-400', px)} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
