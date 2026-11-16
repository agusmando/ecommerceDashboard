import { Check } from 'lucide-react';
import type { RoleDefinition } from '../../api/types';
import { ROLE_LABEL, type StaffRole } from '../../lib/permissions';
import { cn } from '../../lib/utils';

export type RoleChoice = StaffRole | null;

const CUSTOMER_OPTION = {
  key: null,
  label: ROLE_LABEL.CUSTOMER,
  description: 'Sin acceso al panel. Puede comprar en la tienda como cualquier cliente.',
};

/** Selector de rol en tarjetas (radio group). `allowCustomer` agrega "Cliente" (= sin rol). */
export function RolePicker({
  roles,
  value,
  onChange,
  allowCustomer = true,
  disabled,
  name = 'role',
}: {
  roles: RoleDefinition[];
  value: RoleChoice;
  onChange: (r: RoleChoice) => void;
  allowCustomer?: boolean;
  disabled?: boolean;
  name?: string;
}) {
  const options: { key: RoleChoice; label: string; description: string }[] = [
    ...roles.map((r) => ({ key: r.key, label: r.label, description: r.description })),
    ...(allowCustomer ? [CUSTOMER_OPTION] : []),
  ];
  return (
    <div role="radiogroup" aria-label="Rol" className="grid gap-2">
      {options.map((o) => {
        const checked = value === o.key;
        return (
          <label
            key={o.key ?? 'CUSTOMER'}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring',
              checked ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-accent/50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(o.key)}
            />
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
              )}
            >
              {checked && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
