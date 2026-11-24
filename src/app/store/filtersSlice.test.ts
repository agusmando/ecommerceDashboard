import { describe, expect, it } from 'vitest';
import reducer, { patchFilters, resetFilters } from './filtersSlice';

describe('list filter state', () => {
  it('merges patches per list without affecting other lists', () => {
    const initial = { orders: { status: 'PENDING', page: 2 }, products: { active: true } };
    const next = reducer(initial, patchFilters({ key: 'orders', patch: { page: 1, search: 'CER-12' } }));

    expect(next).toEqual({ orders: { status: 'PENDING', page: 1, search: 'CER-12' }, products: { active: true } });
  });

  it('resets one list or replaces it with supplied defaults', () => {
    const initial = { orders: { page: 3 }, products: { active: true } };
    expect(reducer(initial, resetFilters({ key: 'orders' }))).toEqual({ products: { active: true } });
    expect(reducer(initial, resetFilters({ key: 'orders', values: { page: 1 } }))).toEqual({
      orders: { page: 1 },
      products: { active: true },
    });
  });
});