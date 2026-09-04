import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { stripe, syncSubscription } from '../services/stripe.js';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/stripe
 *
 * `express.raw` is mounted on this route specifically: signature verification
 * hashes the exact bytes Stripe sent, and a JSON round-trip would re-serialize
 * them and invalidate the signature. This router must therefore be registered
 * before any global `express.json()`.
 */
webhooksRouter.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    if (typeof signature !== 'string') throw new Error('Missing stripe-signature header');
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    // A bad signature means the payload is not from Stripe. 400 tells the real
    // Stripe to stop retrying, and forged calls get nothing.
    const message = error instanceof Error ? error.message : 'Invalid payload';
    console.warn('Rejected Stripe webhook:', message);
    return res.status(400).json({ error: 'invalid_signature', message });
  }

  // Stripe guarantees at-least-once delivery, so the same event can arrive
  // twice. Claiming the id first makes a replay a no-op: the unique constraint
  // rejects the insert before any subscription state is touched.
  try {
    await prisma.processedEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // The session only carries a subscription id; fetch the object itself
        // so status and period end come from Stripe rather than being guessed.
        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // `deleted` carries the final object with status `canceled`, so the
        // same sync path correctly revokes access.
        await syncSubscription(event.data.object);
        break;
      }

      default:
        // Unhandled types are acknowledged rather than errored, so Stripe does
        // not retry events this app has no opinion about.
        break;
    }
  } catch (error) {
    // Release the idempotency claim so Stripe's retry can genuinely reprocess.
    await prisma.processedEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`Failed handling Stripe event ${event.id}:`, error);
    return res.status(500).json({ error: 'handler_failed' });
  }

  res.json({ received: true });
});
