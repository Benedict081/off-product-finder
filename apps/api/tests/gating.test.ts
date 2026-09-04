import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_USER, prismaMock, resetPrismaMock } from './helpers/prismaMock.js';

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const { createApp } = await import('../src/app.js');
const app = createApp();

const OFF_PRODUCT = {
  status: 1,
  product: {
    code: '3017620422003',
    product_name: 'Nutella',
    brands: 'Ferrero',
    image_front_url: 'https://images.example/front.jpg',
    ingredients_text_en: 'Sugar, palm oil, hazelnuts',
    nutriments: {
      'energy-kcal_100g': 539,
      'energy-kcal_unit': 'kcal',
      fat_100g: 30.9,
      fat_unit: 'g',
      sugars_100g: 56.3,
      sugars_unit: 'g',
    },
  },
};

beforeEach(() => {
  resetPrismaMock();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => OFF_PRODUCT }),
  );
});

afterEach(() => vi.unstubAllGlobals());

/**
 * The central requirement: nutrition is for subscribers only.
 *
 * These assert on the response body rather than on the UI, because the
 * enforcement has to happen in the backend — a client that merely hides the
 * values would still have shipped them over the wire.
 */
describe('nutrition paywall', () => {
  it('serves name, brand and image to everyone', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const response = await request(app).get('/api/products/3017620422003?lang=en');

    expect(response.status).toBe(200);
    expect(response.body.name).toEqual({ value: 'Nutella', language: 'original' });
    expect(response.body.brand).toBe('Ferrero');
    expect(response.body.imageUrl).toBe('https://images.example/front.jpg');
  });

  it('omits nutrition entirely without an active subscription', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    const response = await request(app).get('/api/products/3017620422003?lang=en');

    expect(response.body.nutritionLocked).toBe(true);
    expect(response.body.nutrition).toBeNull();
    // The real guarantee: the numbers are not anywhere in the payload, so no
    // amount of poking at devtools reveals them.
    expect(JSON.stringify(response.body)).not.toContain('539');
    expect(JSON.stringify(response.body)).not.toContain('30.9');
  });

  it('includes nutrition for an active subscriber', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue({ id: 'sub_1' });

    const response = await request(app).get('/api/products/3017620422003?lang=en');

    expect(response.body.nutritionLocked).toBe(false);
    expect(response.body.nutrition).toEqual([
      { key: 'energy-kcal', value: 539, unit: 'kcal' },
      { key: 'fat', value: 30.9, unit: 'g' },
      { key: 'sugars', value: 56.3, unit: 'g' },
    ]);
  });

  it('unlocks on a trial but not on a failed payment', async () => {
    // `past_due` means Stripe is still retrying the card; treating it as active
    // would hand over paid content on a payment that may never land.
    prismaMock.subscription.findFirst.mockResolvedValue(null);
    await request(app).get('/api/products/3017620422003?lang=en');

    const statuses = prismaMock.subscription.findFirst.mock.calls[0]![0].where.status.in;
    expect(statuses).toContain('active');
    expect(statuses).toContain('trialing');
    expect(statuses).not.toContain('past_due');
  });

  it('rejects a malformed barcode before calling the upstream API', async () => {
    const response = await request(app).get('/api/products/not-a-barcode?lang=en');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_request');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an unsupported language', async () => {
    const response = await request(app).get('/api/products/3017620422003?lang=es');

    expect(response.status).toBe(400);
  });

  it('returns 404 when Open Food Facts does not know the barcode', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(null);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 0 }) }),
    );

    const response = await request(app).get('/api/products/9999999999999?lang=en');

    expect(response.status).toBe(404);
  });
});

describe('demo user', () => {
  it('resolves the single demo user for every request', async () => {
    prismaMock.subscription.findFirst.mockResolvedValue(null);

    await request(app).get('/api/products/3017620422003?lang=en');

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'demo@example.com' } }),
    );
    expect(prismaMock.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: DEMO_USER.id }) }),
    );
  });
});
