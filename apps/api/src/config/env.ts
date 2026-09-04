// Loaded here rather than at each entry point so that every consumer — server,
// seed script, and test runner alike — sees the same configuration.
import 'dotenv/config';
import { z } from 'zod';

/**
 * All configuration enters the process here and nowhere else.
 *
 * Parsing at startup means a missing or malformed secret fails the boot with a
 * readable message, rather than surfacing as an opaque 500 the first time a
 * user tries to check out.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Where the browser app runs: used for CORS and for Stripe return URLs.
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),

  // Open Food Facts asks every API consumer to identify itself in the
  // User-Agent. Anonymous traffic gets throttled, so this is not optional
  // in spirit even though it has a default.
  OFF_USER_AGENT: z
    .string()
    .default('OFFProductFinder/1.0 (technical-test; contact@example.com)'),
  OFF_SEARCH_BASE_URL: z.string().url().default('https://search.openfoodfacts.org'),
  OFF_PRODUCT_BASE_URL: z.string().url().default('https://world.openfoodfacts.org'),
  OFF_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),

  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  // Price of the monthly plan, created once in the Stripe dashboard or by
  // `npm run stripe:price`. Kept in env so the same build works against any
  // Stripe account.
  STRIPE_PRICE_ID: z.string().min(1, 'STRIPE_PRICE_ID is required'),

  DEMO_USER_EMAIL: z.string().email().default('demo@example.com'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return parsed.data;
}

export const env: Env = load();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
