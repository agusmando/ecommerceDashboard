import { describe, expect, it } from 'vitest';
import { cleanParams, DEFAULT_API_TIMEOUT_MS, resolveApiTimeout } from './client';

describe('HTTP client helpers', () => {
  it('omits empty query parameters but preserves meaningful false and zero values', () => {
    expect(cleanParams({ empty: '', missing: undefined, nil: null, none: [], active: false, page: 0, tags: ['a', 'b'] })).toEqual({
      active: false,
      page: 0,
      tags: ['a', 'b'],
    });
  });

  it('uses the documented 15 second timeout when configuration is absent or invalid', () => {
    expect(DEFAULT_API_TIMEOUT_MS).toBe(15_000);
    expect(resolveApiTimeout(undefined)).toBe(15_000);
    expect(resolveApiTimeout('0')).toBe(15_000);
    expect(resolveApiTimeout('-1')).toBe(15_000);
    expect(resolveApiTimeout('25000')).toBe(25_000);
  });
});