import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prismaMock, resetPrismaMock } from './helpers/prismaMock.js';

vi.mock('../src/lib/prisma.js', () => ({ prisma: prismaMock }));

/**
 * Stripe's SDK is mocked at the signature-verification boundary. Producing a
 * genuinely valid signature in a test would mean reimplementing Stripe's HMAC
 * scheme, which would test our copy of their algorithm rather than our handler.
 */
const constructEvent = vi.fn();
const subscriptionsRetrieve = vi.fn();

vi.mock('../src/services/stripe.js', async () => {
  const actual = await vi.importActual<typeof import('../src/services/stripe.js')>(
    '../src/services/stripe.js',
  );
  return {
    ...actual,
    stripe: {
      webhooks: { constructEvent },
      subscriptions: { retrieve: subscriptionsRetrieve },
    },
  };
});

const { createApp } = await import('../src/app.js');
const app = createApp();

function stripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    cancel_at_period_end: false,
    metadata: { userId: 'user_demo' },
    items: {
      data: [{ price: { id: 'price_123' }, current_period_end: 1893456000 }],
    },
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock();
  constructEvent.mockReset();
  subscriptionsRetrieve.mockReset();
  prismaMock.user.findUnique.mockResolvedValue({ id: 'user_demo', email: 'demo@example.com' });
});

function post(body: unknown, signature: string | null = 't=1,v1=fake') {
  const req = request(app).post('/api/webhooks/stripe').set('content-type', 'application/json');
  if (signature !== null) req.set('stripe-signature', signature);
  return req.send(body as object);
}

describe('POST /api/webhooks/stripe', () => {
  it('rejects a payload with an invalid signature', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const response = await post({ type: 'customer.subscription.created' });

    expect(response.status).toBe(400);
    // Nothing may be written on the strength of an unverified payload.
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
    expect(prismaMock.processedEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a payload with no signature header at all', async () => {
    const response = await post({ type: 'customer.subscription.created' }, null);

    expect(response.status).toBe(400);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('activates the subscription on customer.subscription.created', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.subscription.created',
      data: { object: stripeSubscription() },
    });

    const response = await post({});

    expect(response.status).toBe(200);
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_123' },
        update: expect.objectContaining({ status: 'active', stripePriceId: 'price_123' }),
      }),
    );
  });

  it('fetches the subscription itself on checkout.session.completed', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: { subscription: 'sub_123', client_reference_id: 'user_demo' } },
    });
    subscriptionsRetrieve.mockResolvedValue(stripeSubscription());

    await post({});

    // The session carries only an id; status and period end must come from the
    // subscription object rather than being assumed.
    expect(subscriptionsRetrieve).toHaveBeenCalledWith('sub_123');
    expect(prismaMock.subscription.upsert).toHaveBeenCalled();
  });

  it('revokes access on customer.subscription.deleted', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: { object: stripeSubscription({ status: 'canceled' }) },
    });

    await post({});

    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ status: 'canceled' }) }),
    );
  });

  it('processes a redelivered event only once', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.subscription.created',
      data: { object: stripeSubscription() },
    });
    // The unique constraint on the event id is what makes the replay a no-op.
    prismaMock.processedEvent.create.mockRejectedValue(new Error('Unique constraint failed'));

    const response = await post({});

    expect(response.status).toBe(200);
    expect(response.body.duplicate).toBe(true);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it('releases the idempotency claim when handling fails, so Stripe can retry', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_4',
      type: 'customer.subscription.created',
      data: { object: stripeSubscription() },
    });
    prismaMock.subscription.upsert.mockRejectedValue(new Error('database is down'));

    const response = await post({});

    expect(response.status).toBe(500);
    // Without this the retry would be swallowed as a duplicate and the customer
    // would stay locked out after paying.
    expect(prismaMock.processedEvent.delete).toHaveBeenCalledWith({ where: { id: 'evt_4' } });
  });

  it('acknowledges event types it has no opinion about', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_5',
      type: 'invoice.created',
      data: { object: {} },
    });

    const response = await post({});

    // A non-2xx here would make Stripe retry an event we will never act on.
    expect(response.status).toBe(200);
    expect(prismaMock.subscription.upsert).not.toHaveBeenCalled();
  });
});
