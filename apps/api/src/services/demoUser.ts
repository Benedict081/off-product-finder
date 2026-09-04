import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/**
 * The assignment specifies one demo user and no authentication, so "who is
 * asking" is a fixed lookup rather than a session.
 *
 * Isolating it here means the day real auth arrives, only this function and the
 * middleware that calls it change — routes already take a userId.
 */
export async function getDemoUser() {
  return prisma.user.upsert({
    where: { email: env.DEMO_USER_EMAIL },
    update: {},
    create: { email: env.DEMO_USER_EMAIL },
  });
}
