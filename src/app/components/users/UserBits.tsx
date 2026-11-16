import { Badge } from '../Badge';
import type { ManagedUser } from '../../api/types';
import { ROLE_LABEL, ROLE_TONE, type StaffRole } from '../../lib/permissions';
import { cn } from '../../lib/utils';

export function RoleBadge({ role }: { role: StaffRole | null }) {
  const key = role ?? 'CUSTOMER';
  return <Badge tone={ROLE_TONE[key]}>{ROLE_LABEL[key]}</Badge>;
}

const initialsOf = (u: Pick<ManagedUser, 'name' | 'email'>) =>
  (u.name || u.email?.split('@')[0] || '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function UserAvatar({ user, size = 'md' }: { user: Pick<ManagedUser, 'name' | 'email' | 'avatarUrl'>; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';
  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={cn('shrink-0 rounded-full object-cover bg-muted', cls)}
    />
  ) : (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground', cls)}
    >
      {initialsOf(user)}
    </span>
  );
}
