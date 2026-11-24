import { describe, expect, it } from 'vitest';
import { AFFECTS, normalizePaginated } from './baseApi';
import { validateCurrentUser, validateResource, validateResourceList, validateSpecialized } from './contracts';

describe('API resource contracts', () => {
  it('accepts required category fields and keeps fields added by the backend', () => {
    const category = { id: 2, name: 'Almacén', active: true, description: 'Productos secos' };

    expect(validateResource('category', category)).toEqual(category);
  });

  it('reports the resource and item index when the response shape is invalid', () => {
    expect(() => validateResourceList('order', [{ id: 4, status: 'UNKNOWN', totalPrice: 10 }])).toThrow(
      'Elemento 1: La respuesta de /order no coincide con el contrato esperado',
    );
  });

  it('validates the minimum identity and role contract used to open the dashboard', () => {
    const user = {
      id: 5,
      supertokensId: 'st-5',
      email: null,
      name: null,
      avatarUrl: null,
      role: 'EMPLOYEE',
      roles: ['EMPLOYEE'],
      permissions: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(validateCurrentUser(user)).toMatchObject({ id: 5, supertokensId: 'st-5', role: 'EMPLOYEE' });
    expect(() => validateCurrentUser({ ...user, id: '5', role: 'UNKNOWN' })).toThrow('/user/me');
  });

  it('validates known specialized shipping and review contracts', () => {
    expect(
      validateSpecialized('shippingConfig', {
        zones: [{ name: 'Montevideo', price: 250, etaMinutes: 120 }],
        departments: ['Montevideo'],
        providers: { uber: false },
        pickup: { name: 'Local', address: 'Centro' },
      }),
    ).toMatchObject({ providers: { uber: false } });

    expect(() => validateSpecialized('reviewStats', { pending: 1, approved: '2', rejected: 0, average: 4 })).toThrow(
      'respuesta especializada reviewStats',
    );
  });
});

describe('normalizePaginated', () => {
  it('wraps array responses in a single page', () => {
    expect(normalizePaginated(['a', 'b'])).toEqual({
      content: ['a', 'b'],
      pagination: { page: 1, amountPerPage: 2, totalAmount: 2, totalPages: 1 },
    });
  });

  it('normalizes missing pagination metadata and never returns zero pages', () => {
    expect(normalizePaginated({ content: ['a'], pagination: { page: 1, totalAmount: 0, amountPerPage: 0, totalPages: 0 } })).toEqual({
      content: ['a'],
      pagination: { page: 1, amountPerPage: 0, totalAmount: 0, totalPages: 1 },
    });
  });
});

describe('RTK Query cache dependencies', () => {
  it('invalidates inventory, movement and shipment views after order changes', () => {
    expect(AFFECTS.order).toEqual(expect.arrayContaining(['Order', 'OrderItem', 'Variant', 'Movement', 'Shipment']));
  });
});