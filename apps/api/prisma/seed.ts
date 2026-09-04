import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the single demo user the assignment calls for.
 *
 * Idempotent, so re-running after a `migrate reset` is safe and the demo user's
 * id stays stable for anyone poking at the database by hand.
 */
async function main() {
  const email = process.env.DEMO_USER_EMAIL ?? 'demo@example.com';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  console.log(`Demo user ready: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
