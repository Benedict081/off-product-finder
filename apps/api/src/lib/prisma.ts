import { PrismaClient } from '@prisma/client';

/**
 * A single client for the process.
 *
 * `tsx watch` re-evaluates modules on every save, and a fresh PrismaClient per
 * reload leaks connections until MySQL starts refusing them. Stashing the
 * instance on globalThis keeps development to one pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
