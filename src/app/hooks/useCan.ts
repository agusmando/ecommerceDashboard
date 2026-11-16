import { useCallback } from 'react';
import { useAppSelector } from '../store';
import { hasPermission, type Permission } from '../lib/permissions';

/** `const can = useCan(); can('catalog.edit')` — solo para la UI: el backend vuelve a validar. */
export function useCan() {
  const user = useAppSelector((s) => s.auth.user);
  return useCallback((permission: Permission) => hasPermission(user, permission), [user]);
}
