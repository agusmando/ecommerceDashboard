import { describe, expect, it } from 'vitest';
import { hasPermission, type Permission } from './permissions';
import type { User } from '../api/types';

const user = (permissions: Permission[] | undefined, roles: string[] = []) => ({ permissions, roles }) as User;

describe('hasPermission', () => {
  it('denies access without a user and prefers effective backend permissions', () => {
    expect(hasPermission(null, 'dashboard.access')).toBe(false);
    expect(hasPermission(user(['orders.manage']), 'dashboard.access')).toBe(false);
    expect(hasPermission(user(['orders.manage']), 'orders.manage')).toBe(true);
  });

  it('preserves the legacy ADMIN/EMPLOYEE fallback when permissions are absent', () => {
    expect(hasPermission(user(undefined, ['ADMIN']), 'users.manage')).toBe(true);
    expect(hasPermission(user(undefined, ['EMPLOYEE']), 'orders.manage')).toBe(true);
    expect(hasPermission(user(undefined, ['EMPLOYEE']), 'users.manage')).toBe(false);
  });
});