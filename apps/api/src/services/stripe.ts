import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type { Language } from '../types/product.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/**
 * Stripe Checkout is localized too, so the payment page continues in whatever
 * language the user picked rather than snapping back to English. Stripe happens
 * to accept our four codes verbatim; the map makes that dependency explicit
 * instead of implied.
 */
const CHECKOUT_LOCALES: Record<Language, Stripe.Checkout.SessionCreateParams.Locale> = {
  en: 'en',
  nl: 'nl',
  de: 'de',
  fr: 'fr',
};

/**
 * Find or create this user's Stripe customer.
 *
 * Reusing one customer keeps a subscriber's invoices together and stops a
 * second checkout from creating a duplicate record in Stripe.
 */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId !== null) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    // Lets us recover the local user from any Stripe object during webhooks.
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  language: Language,
): Promise<Stripe.Checkout.Session> {
  const customerId = await ensureStripeCustomer(userId);

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    locale: CHECKOUT_LOCALES[language],
    // Returning into the localized route keeps the language across the redirect.
    success_url: `${env.WEB_APP_URL}/${language}/account?checkout=success`,
    cancel_url: `${env.WEB_APP_URL}/${language}/account?checkout=cancelled`,
    client_reference_id: userId,
    subscription_data: { metadata: { userId } },
  });
}

/**
 * Read the period end off a subscription.
 *
 * Stripe moved `current_period_end` from the subscription to its items in the
 * 2025-03-31 API version. Checking both keeps this working across accounts
 * pinned to either version.
 */
function readPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  const legacy = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  const seconds = fromItem ?? legacy;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function customerId(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;
}

/**
 * Write a Stripe subscription into the local mirror.
 *
 * The user is resolved from metadata first and the customer id second, because
 * metadata survives even if the customer link is somehow missing locally.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const metadataUserId = subscription.metadata?.['userId'];

  const user =
    (metadataUserId
      ? await prisma.user.findUnique({ where: { id: metadataUserId } })
      : null) ??
    (await prisma.user.findUnique({ where: { stripeCustomerId: customerId(subscription) } }));

  if (user === null) {
    // A subscription for someone we do not know is not an error we can fix by
    // failing the webhook — Stripe would just retry it forever.
    console.warn(`No local user for Stripe subscription ${subscription.id}; skipping.`);
    return;
  }

  const data = {
    userId: user.id,
    status: subscription.status,
    stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
    currentPeriodEnd: readPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  };

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: { stripeSubscriptionId: subscription.id, ...data },
    update: data,
  });
}
