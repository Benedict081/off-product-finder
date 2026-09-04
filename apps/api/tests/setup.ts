/**
 * Test configuration.
 *
 * Set before any module imports `src/config/env.ts`. dotenv does not override
 * variables that already exist, so these win over a developer's local .env and
 * the suite behaves the same on every machine and in CI.
 */
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'mysql://root:@localhost:3306/off_finder_test';
process.env['STRIPE_SECRET_KEY'] = 'sk_test_dummy';
process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_dummy';
process.env['STRIPE_PRICE_ID'] = 'price_dummy';
process.env['WEB_APP_URL'] = 'http://localhost:3000';
process.env['DEMO_USER_EMAIL'] = 'demo@example.com';
