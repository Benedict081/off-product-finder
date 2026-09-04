import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getProduct, searchProducts } from '../services/openFoodFacts.js';
import { hasActiveSubscription } from '../services/subscription.js';
import { HttpError } from '../middleware/errorHandler.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../types/product.js';

const languageSchema = z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE);

const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Search term must be at least 2 characters').max(100),
  lang: languageSchema,
  page: z.coerce.number().int().min(1).max(50).default(1),
});

const detailQuerySchema = z.object({ lang: languageSchema });

// Open Food Facts barcodes are 8-14 digits; validating here keeps junk out of
// the upstream URL.
const barcodeSchema = z.string().regex(/^\d{8,14}$/, 'Invalid barcode');

export const productsRouter = Router();

/**
 * GET /api/products/search?q=&lang=&page=
 *
 * Public. Returns summaries only — never nutrition data — so there is nothing
 * here to gate.
 */
productsRouter.get('/search', async (req, res, next) => {
  try {
    const { q, lang, page } = searchQuerySchema.parse(req.query);

    const result = await searchProducts({ term: q, language: lang, page });

    // Recording the search is a side effect of the user's action, not something
    // they are waiting on, so a logging failure must not fail their search.
    if (req.userId !== undefined && page === 1) {
      prisma.search
        .create({
          data: {
            userId: req.userId,
            term: q,
            language: lang,
            resultCount: result.products.length,
          },
        })
        .catch((error: unknown) => console.error('Failed to record search:', error));
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:barcode?lang=
 *
 * Basic information is public. Nutrition is resolved from the subscription and
 * omitted server-side when the user is not entitled, so an unsubscribed client
 * never receives the values in the first place.
 */
productsRouter.get('/:barcode', async (req, res, next) => {
  try {
    const barcode = barcodeSchema.parse(req.params.barcode);
    const { lang } = detailQuerySchema.parse(req.query);

    const entitled =
      req.userId !== undefined && (await hasActiveSubscription(req.userId));

    const product = await getProduct(barcode, lang, entitled);
    if (product === null) {
      throw new HttpError(404, 'Product not found');
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});
