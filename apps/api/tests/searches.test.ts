import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_USER, prismaMock, resetPrismaMock } from './helpers/prismaMock.js';

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));

const { createApp } = await import('../src/app.js');
const app = createApp();

const SEARCH_RESPONSE = {
  hits: [
    { code: '111111111', product_name_nl: 'Chocolade' },
    { code: '222222222', product_name_nl: 'Melkchocolade' },
  ],
  page_count: 5,
};

beforeEach(() => {
  resetPrismaMock();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => SEARCH_RESPONSE }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('GET /api/products/search', () => {
  it('records the search against the demo user with its language', async () => {
    const response = await request(app).get('/api/products/search?q=chocolade&lang=nl');

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(2);
    expect(prismaMock.search.create).toHaveBeenCalledWith({
      data: {
        userId: DEMO_USER.id,
        term: 'chocolade',
        language: 'nl',
        resultCount: 2,
      },
    });
  });

  it('only records the first page, so paging does not spam the history', async () => {
    await request(app).get('/api/products/search?q=chocolade&lang=nl&page=3');

    expect(prismaMock.search.create).not.toHaveBeenCalled();
  });

  it('still returns results when recording the search fails', async () => {
    // History is a side effect of the user's action, not something they are
    // waiting on; a logging failure must not cost them their results.
    prismaMock.search.create.mockRejectedValue(new Error('database is down'));

    const response = await request(app).get('/api/products/search?q=chocolade&lang=nl');

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(2);
  });

  it('rejects a search term that is too short to be useful', async () => {
    const response = await request(app).get('/api/products/search?q=a&lang=en');

    expect(response.status).toBe(400);
    expect(response.body.issues[0].path).toBe('q');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('defaults to English when no language is given', async () => {
    await request(app).get('/api/products/search?q=chocolate');

    const url = new URL((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string);
    expect(url.searchParams.get('langs')).toBe('en');
  });
});

describe('GET /api/searches/recent', () => {
  it('collapses repeats to the most recent, keeping newest first', async () => {
    prismaMock.search.findMany.mockResolvedValue([
      { id: '3', term: 'chocolade', language: 'nl', resultCount: 2, createdAt: new Date('2026-01-03') },
      { id: '2', term: 'melk', language: 'nl', resultCount: 5, createdAt: new Date('2026-01-02') },
      { id: '1', term: 'Chocolade', language: 'nl', resultCount: 2, createdAt: new Date('2026-01-01') },
    ]);

    const response = await request(app).get('/api/searches/recent');

    // The older, differently-cased "Chocolade" is the same search to a user.
    expect(response.body.searches.map((s: { id: string }) => s.id)).toEqual(['3', '2']);
  });

  it('treats the same term in another language as a distinct search', async () => {
    prismaMock.search.findMany.mockResolvedValue([
      { id: '2', term: 'chocolate', language: 'fr', resultCount: 1, createdAt: new Date('2026-01-02') },
      { id: '1', term: 'chocolate', language: 'en', resultCount: 1, createdAt: new Date('2026-01-01') },
    ]);

    const response = await request(app).get('/api/searches/recent');

    expect(response.body.searches).toHaveLength(2);
  });

  it('honours the limit after deduplication', async () => {
    prismaMock.search.findMany.mockResolvedValue([
      { id: '3', term: 'a', language: 'en', resultCount: 0, createdAt: new Date('2026-01-03') },
      { id: '2', term: 'a', language: 'en', resultCount: 0, createdAt: new Date('2026-01-02') },
      { id: '1', term: 'b', language: 'en', resultCount: 0, createdAt: new Date('2026-01-01') },
    ]);

    const response = await request(app).get('/api/searches/recent?limit=1');

    expect(response.body.searches).toHaveLength(1);
    expect(response.body.searches[0].term).toBe('a');
  });
});
