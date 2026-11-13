import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import type { Tone } from '../lib/domain';
import {
  MOVEMENT_TYPE,
  OFFER_STATE,
  ORDER_ITEM_STATUS,
  ORDER_STATUS,
  type OfferState,
} from '../lib/domain';
import type { MovementType, OrderItemStatus, OrderStatus } from '../api/types';

const TONES: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground ring-border',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
};

const DOTS: Record<Tone, string> = {
  default: 'bg-muted-foreground/60',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  violet: 'bg-violet-500',
};

interface BadgeProps {
  /** Alias histórico de `tone`. */
  variant?: Tone;
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({ variant, tone, dot, children, className, title }: BadgeProps) {
  const t = tone ?? variant ?? 'default';
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[t],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[t])} />}
      {children}
    </span>
  );
}

export const ActiveBadge = ({ active }: { active: boolean }) => (
  <Badge tone={active ? 'success' : 'default'} dot>
    {active ? 'Activo' : 'Inactivo'}
  </Badge>
);

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const s = ORDER_STATUS[status] ?? { label: status, tone: 'default' as Tone };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
};

export const OrderItemStatusBadge = ({ status }: { status: OrderItemStatus }) => {
  const s = ORDER_ITEM_STATUS[status] ?? { label: status, tone: 'default' as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

export const MovementTypeBadge = ({ type }: { type: MovementType }) => {
  const s = MOVEMENT_TYPE[type] ?? { label: type, tone: 'default' as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

export const OfferStateBadge = ({ state }: { state: OfferState }) => (
  <Badge tone={OFFER_STATE[state].tone} dot>
    {OFFER_STATE[state].label}
  </Badge>
);
