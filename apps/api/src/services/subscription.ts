import { prisma } from '../lib/prisma.js';

/**
 * Stripe statuses that should unlock paid content.
 *
 * `trialing` counts: the customer is inside a trial Stripe considers valid.
 * `past_due` deliberately does not — Stripe is still retrying payment, and
 * treating it as active would give away the product on a failed card.
 */
const ENTITLING_STATUSES = ['active', 'trialing'] as const;

/**
 * Whether a user may see paid content.
 *
 * Reads the local mirror rather than calling Stripe, so a page view costs one
 * indexed query. The webhook handler keeps the mirror current.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [...ENTITLING_STATUSES] },
    },
    select: { id: true },
  });

  return subscription !== null;
}

export interface SubscriptionStatus {
  active: boolean;
  status: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/** The full status the billing screen needs. */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (subscription === null) {
    return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }

  return {
    active: (ENTITLING_STATUSES as readonly string[]).includes(subscription.status),
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}
