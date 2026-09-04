import { vi } from 'vitest';

/**
 * A hand-rolled Prisma double.
 *
 * The tests here are about our own logic — language fallback, paywall
 * enforcement, webhook idempotency — none of which needs a real MySQL server.
 * Mocking at the client boundary keeps the suite runnable with `npm test` on a
 * clean checkout, which matters more here than exercising SQL.
 */
export const prismaMock = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  search: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  processedEvent: {
    create: vi.fn(),
    delete: vi.fn(),
  },
};

export const DEMO_USER = {
  id: 'user_demo',
  email: 'demo@example.com',
  stripeCustomerId: null,
};

/** Reset every mock and restore the default "demo user exists" behaviour. */
export function resetPrismaMock(): void {
  for (const model of Object.values(prismaMock)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  prismaMock.user.upsert.mockResolvedValue(DEMO_USER);
  prismaMock.search.create.mockResolvedValue({ id: 'search_1' });
  prismaMock.processedEvent.create.mockResolvedValue({ id: 'evt_1' });
}
