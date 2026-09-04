import { Router } from 'express';
import { z } from 'zod';
import { createCheckoutSession } from '../services/stripe.js';
import { getSubscriptionStatus } from '../services/subscription.js';
import { HttpError } from '../middleware/errorHandler.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../types/product.js';

const checkoutSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE),
});

export const billingRouter = Router();

/** GET /api/billing/status — drives the paywall UI. */
billingRouter.get('/status', async (req, res, next) => {
  try {
    if (req.userId === undefined) throw new HttpError(401, 'No user in context');

    // The email is echoed back so the account screen can state plainly which
    // demo user it is acting as — this build has no authentication.
    const status = await getSubscriptionStatus(req.userId);
    res.json({ ...status, email: req.userEmail ?? null });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/checkout-session
 *
 * Returns the hosted Checkout URL for the client to redirect to. Card details
 * are only ever entered on Stripe's page, so nothing sensitive touches this
 * server.
 */
billingRouter.post('/checkout-session', async (req, res, next) => {
  try {
    if (req.userId === undefined) throw new HttpError(401, 'No user in context');
    const { language } = checkoutSchema.parse(req.body ?? {});

    const session = await createCheckoutSession(req.userId, language);
    if (session.url === null) {
      throw new HttpError(502, 'Stripe did not return a checkout URL');
    }

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});
