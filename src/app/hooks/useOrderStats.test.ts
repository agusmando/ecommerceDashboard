import { describe, expect, it } from 'vitest';
import type { Order } from '../api/types';
import { computeStats, NO_ZONE } from './useOrderStats';

const makeOrder = (overrides: Partial<Order>): Order => ({
  id: 1,
  userSuperTokensId: 'user-1',
  createdAt: '2026-11-20T12:00:00.000Z',
  updatedAt: '2026-11-20T12:00:00.000Z',
  totalPrice: 100,
  totalItems: 1,
  paymentType: 'CASH',
  estimatedReadyAt: null,
  status: 'PROCESSING',
  ...overrides,
});

describe('computeStats', () => {
  it('excludes cancelled orders from revenue and separates delivery revenue', () => {
    const stats = computeStats(
      [
        makeOrder({ shippingMethod: 'DELIVERY', shippingCost: 15, shippingZone: 'Montevideo' }),
        makeOrder({ id: 2, status: 'CANCELLED', totalPrice: 500, shippingCost: 30 }),
      ],
      '2026-11-20',
    );

    expect(stats.revenue).toBe(100);
    expect(stats.shipping.revenue).toBe(15);
    expect(stats.chargedRevenue).toBe(115);
    expect(stats.validCount).toBe(1);
    expect(stats.shipping.byZone[0]?.zone).toBe('Montevideo');
  });

  it('counts pickups separately and labels missing delivery zones', () => {
    const stats = computeStats(
      [
        makeOrder({ shippingMethod: 'PICKUP' }),
        makeOrder({ id: 2, shippingMethod: 'DELIVERY', shippingCost: 0 }),
      ],
      '2026-11-20',
    );

    expect(stats.shipping.pickups).toBe(1);
    expect(stats.shipping.deliveries).toBe(1);
    expect(stats.shipping.paidDeliveries).toBe(0);
    expect(stats.shipping.byZone[0]?.zone).toBe(NO_ZONE);
  });
});