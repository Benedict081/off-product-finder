import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { attachDemoUser } from './middleware/demoUser.js';
import { errorHandler } from './middleware/errorHandler.js';
import { billingRouter } from './routes/billing.js';
import { productsRouter } from './routes/products.js';
import { searchesRouter } from './routes/searches.js';
import { webhooksRouter } from './routes/webhooks.js';

/**
 * Builds the Express app without starting a server.
 *
 * Keeping `listen` out of here is what lets the tests drive the real app
 * through supertest on an ephemeral port instead of mocking routing.
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.WEB_APP_URL, credentials: true }));

  // Mounted before express.json() on purpose: Stripe signature verification
  // needs the untouched request bytes, and a JSON parse would consume them.
  app.use('/api/webhooks', webhooksRouter);

  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Everything past this point acts on behalf of the demo user.
  app.use('/api', attachDemoUser);
  app.use('/api/products', productsRouter);
  app.use('/api/searches', searchesRouter);
  app.use('/api/billing', billingRouter);

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use(errorHandler);

  return app;
}
