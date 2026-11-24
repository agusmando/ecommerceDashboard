import axios, { type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSession, tokens } from './client';

afterEach(() => {
  tokens.clear();
  vi.restoreAllMocks();
});

describe('SuperTokens header refresh', () => {
  it('captures rotated tokens returned by the refresh endpoint', async () => {
    tokens.set({ refresh: 'refresh-old' });
    vi.spyOn(axios, 'post').mockResolvedValue({
      headers: { 'st-access-token': 'access-new', 'st-refresh-token': 'refresh-new' },
    } as unknown as AxiosResponse);

    await expect(refreshSession()).resolves.toBe('ok');
    expect(tokens.access).toBe('access-new');
    expect(tokens.refresh).toBe('refresh-new');
  });
});