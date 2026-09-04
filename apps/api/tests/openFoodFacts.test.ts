import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OpenFoodFactsError,
  getProduct,
  searchProducts,
} from '../src/services/openFoodFacts.js';

/** Captures the URL the service builds so query parameters can be asserted. */
function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('searchProducts', () => {
  it('asks Open Food Facts to match in the selected language', async () => {
    const fetchMock = mockFetch({ hits: [], page_count: 0 });

    await searchProducts({ term: 'chocolade', language: 'nl' });

    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.searchParams.get('q')).toBe('chocolade');
    // `langs` is what points the query at the product_name.nl analyzer; without
    // it the search is effectively English-only.
    expect(url.searchParams.get('langs')).toBe('nl');
    expect(url.searchParams.get('fields')).toContain('product_name_nl');
  });

  it('identifies itself in the User-Agent, as the API policy requires', async () => {
    const fetchMock = mockFetch({ hits: [], page_count: 0 });

    await searchProducts({ term: 'milk', language: 'en' });

    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/OFFProductFinder/);
  });

  it('drops unusable hits instead of failing the whole search', async () => {
    mockFetch({
      hits: [
        { code: '123456789', product_name_en: 'Good product' },
        { product_name_en: 'No barcode, unusable' },
      ],
      page_count: 1,
    });

    const result = await searchProducts({ term: 'x', language: 'en' });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]?.barcode).toBe('123456789');
  });

  it('reports upstream failures as a gateway error', async () => {
    mockFetch({}, { ok: false, status: 503 });

    await expect(searchProducts({ term: 'x', language: 'en' })).rejects.toBeInstanceOf(
      OpenFoodFactsError,
    );
  });

  it('turns a timeout into a 504 rather than an unhandled rejection', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    await expect(searchProducts({ term: 'x', language: 'en' })).rejects.toMatchObject({
      status: 504,
    });
  });
});

describe('getProduct', () => {
  const product = {
    code: '3017620422003',
    product_name: 'Nutella',
    brands: 'Ferrero',
    ingredients_text_nl: 'Suiker, palmolie, HAZELNOTEN',
    allergens_tags: ['en:milk', 'en:soybeans'],
    nutriments: { fat_100g: 30.9, fat_unit: 'g' },
  };

  it('passes the language as `lc`, which also localizes the product image', async () => {
    const fetchMock = mockFetch({ status: 1, product });

    await getProduct('3017620422003', 'nl', true);

    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.pathname).toBe('/api/v2/product/3017620422003.json');
    expect(url.searchParams.get('lc')).toBe('nl');
  });

  it('returns localized ingredients and readable allergen tags', async () => {
    mockFetch({ status: 1, product });

    const detail = await getProduct('3017620422003', 'nl', true);

    expect(detail?.ingredients).toEqual({
      value: 'Suiker, palmolie, HAZELNOTEN',
      language: 'nl',
    });
    // Tags arrive as `en:milk`; the language prefix is noise to the user.
    expect(detail?.allergens).toEqual(['milk', 'soybeans']);
  });

  it('treats the API’s status 0 as not found', async () => {
    // Open Food Facts answers 200 with status 0 for an unknown barcode.
    mockFetch({ status: 0, product: null });

    expect(await getProduct('0000000000000', 'en', true)).toBeNull();
  });

  it('rejects an HTML maintenance page served with a 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }),
    );

    await expect(getProduct('3017620422003', 'en', true)).rejects.toMatchObject({ status: 502 });
  });
});
