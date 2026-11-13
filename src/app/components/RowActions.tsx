import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export interface RowAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  /** Separador antes de este ítem. */
  separator?: boolean;
}

/** Menú "⋯" para las acciones de una fila. No propaga el click a la fila. */
export function RowActions({ actions, label = 'Acciones' }: { actions: RowAction[]; label?: string }) {
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  return (
    <div onClick={(e) => e.stopPropagation()} className="inline-flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {visible.map((a) => (
            <div key={a.label}>
              {a.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={a.disabled}
                onSelect={a.onClick}
                className={cn('gap-2', a.danger && 'text-destructive focus:text-destructive')}
              >
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
