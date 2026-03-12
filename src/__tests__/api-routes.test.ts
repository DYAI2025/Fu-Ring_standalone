import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadTestApp = async () => {
  vi.resetModules();
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const mod = await import('../../server.mjs');
  return mod.app;
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('server api routes', () => {
  it('proxies /api/transit-state/:userId', async () => {
    const app = await loadTestApp();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({
        ring: { sectors: Array(12).fill(0.6) },
        soulprint: { sectors: Array(12).fill(0.4) },
        transit_contribution: { transit_intensity: 0.7 },
        delta: { vs_30day_avg: { avg_sectors: Array(12).fill(0.35) } },
        events: [],
        resolution: 42,
      }),
    } as Response);

    const response = await request(app).get('/api/transit-state/user-1');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.ring.sectors).toHaveLength(12);
  });

  it('returns neutral fallback from /api/space-weather when upstream fails', async () => {
    const app = await loadTestApp();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));

    const response = await request(app).get('/api/space-weather');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('max-age=900');
    expect(response.body.kp_index).toBe(0);
    expect(response.body.source).toBe('DONKI');
    expect(response.body.fetched_at).toEqual(expect.any(String));
    expect(response.body.cache_ttl_seconds).toBe(900);
  });
});
