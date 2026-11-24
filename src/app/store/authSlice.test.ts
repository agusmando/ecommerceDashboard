import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './authSlice';

describe('Google OAuth return path', () => {
  it('allows internal paths and rejects external or protocol-relative destinations', () => {
    expect(safeReturnTo('/dashboard/orders?status=PENDING')).toBe('/dashboard/orders?status=PENDING');
    expect(safeReturnTo('//attacker.example')).toBe('/dashboard');
    expect(safeReturnTo('https://attacker.example')).toBe('/dashboard');
    expect(safeReturnTo(undefined)).toBe('/dashboard');
  });
});