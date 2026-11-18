import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRightLeft, Plus, X } from 'lucide-react';
import type { Id } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { Button } from '../Button';
import { EmptyState } from '../States';

/**
 * Lista de entidades relacionadas con opción de agregar/quitar
 * (PUT/DELETE /{recurso}/:id/{relación}) y, opcionalmente, de moverlas a otro
 * registro (`onMove`, p. ej. pasar una marca a otro proveedor).
 */
export function RelationEditor({
  title,
  items,
  onChange,
  renderPicker,
  linkTo,
  emptyText,
  readOnly,
  removable = true,
  onMove,
  renderMoveTarget,
  moveLabel = 'Mover a…',
}: {
  title: string;
  items: { id: Id; name: string; active?: boolean }[];
  /** `attach=false` desasocia. */
  onChange?: (ids: Id[], attach: boolean) => Promise<unknown>;
  renderPicker?: (state: { value: Id[]; onChange: (ids: Id[]) => void; exclude: Id[] }) => ReactNode;
  linkTo?: (id: Id) => string;
  emptyText: string;
  readOnly?: boolean;
  /** false: no se puede quitar (la relación es obligatoria; solo mover). */
  removable?: boolean;
  onMove?: (ids: Id[], targetId: Id) => Promise<unknown>;
  renderMoveTarget?: (state: { value: Id | null; onChange: (id: Id | null) => void }) => ReactNode;
  moveLabel?: string;
}) {
  const [adding, setAdding] = useState<Id[]>([]);
  const [moving, setMoving] = useState<Id | null>(null);
  const [target, setTarget] = useState<Id | null>(null);
  const [move, movingBusy] = useAction((ids: Id[], to: Id) => onMove!(ids, to), { success: 'Movido' });
  const startMove = (id: Id) => {
    setMoving((cur) => (cur === id ? null : id));
    setTarget(null);
  };
  const [run, busy] = useAction(
    async (ids: Id[], attach: boolean) => {
      await onChange!(ids, attach);
      return attach;
    },
    { success: (attached) => (attached ? 'Asociación guardada' : 'Asociación quitada') },
  );

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {title} <span className="text-muted-foreground font-normal">({items.length})</span>
      </h3>

      {!readOnly && renderPicker && (
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            {renderPicker({ value: adding, onChange: setAdding, exclude: items.map((i) => i.id) })}
          </div>
          <Button
            variant="outline"
            disabled={!adding.length}
            loading={busy}
            onClick={() => run(adding, true).then(() => setAdding([]))}
          >
            <Plus className="w-4 h-4" />
            Asociar
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={emptyText} className="py-6" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((it) => (
            <li key={it.id} className="px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
              {linkTo ? (
                <Link to={linkTo(it.id)} className="flex-1 truncate text-foreground hover:text-primary hover:underline">
                  {it.name}
                </Link>
              ) : (
                <span className="flex-1 truncate">{it.name}</span>
              )}
              {it.active === false && <span className="text-xs text-muted-foreground">inactivo</span>}
              {!readOnly && onMove && renderMoveTarget && (
                <button
                  type="button"
                  onClick={() => startMove(it.id)}
                  disabled={movingBusy}
                  aria-label={`Mover ${it.name}`}
                  aria-expanded={moving === it.id}
                  title={moveLabel}
                  className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
              )}
              {!readOnly && removable && onChange && (
                <button
                  type="button"
                  onClick={() => run([it.id], false)}
                  disabled={busy}
                  aria-label={`Quitar ${it.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              </div>
              {moving === it.id && renderMoveTarget && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1 min-w-0">{renderMoveTarget({ value: target, onChange: setTarget })}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!target}
                      loading={movingBusy}
                      onClick={() => move([it.id], target!).then(() => setMoving(null), () => {})}
                    >
                      Mover
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMoving(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
