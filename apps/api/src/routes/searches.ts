import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const searchesRouter = Router();

/**
 * GET /api/searches/recent?limit=
 *
 * Returns the user's most recent searches, most recent first.
 *
 * Repeating a search should move it up the list, not add a duplicate, so rows
 * are collapsed on (term, language) keeping the newest of each. The database
 * keeps the full history; only the display is deduplicated.
 */
searchesRouter.get('/recent', async (req, res, next) => {
  try {
    const { limit } = querySchema.parse(req.query);
    if (req.userId === undefined) throw new HttpError(401, 'No user in context');

    // Over-fetch so that collapsing duplicates still leaves `limit` rows.
    const rows = await prisma.search.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 5,
    });

    interface RecentSearch {
      id: string;
      term: string;
      language: string;
      resultCount: number;
      createdAt: Date;
    }

    const seen = new Set<string>();
    const searches: RecentSearch[] = [];
    for (const row of rows) {
      const key = `${row.language}:${row.term.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      searches.push({
        id: row.id,
        term: row.term,
        language: row.language,
        resultCount: row.resultCount,
        createdAt: row.createdAt,
      });
      if (searches.length === limit) break;
    }

    res.json({ searches });
  } catch (error) {
    next(error);
  }
});
