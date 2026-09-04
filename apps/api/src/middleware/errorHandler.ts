import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { OpenFoodFactsError } from '../services/openFoodFacts.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Single translation point from thrown errors to HTTP responses, so no route
 * has to remember to shape its own error body.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies error middleware by arity, so `next` must stay.
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'invalid_request',
      // `issues` is the shape the frontend uses to mark the offending field.
      issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (error instanceof OpenFoodFactsError) {
    return res.status(error.status).json({ error: 'upstream_error', message: error.message });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: 'request_failed', message: error.message });
  }

  // Anything reaching here is a bug: log it in full, tell the client nothing.
  console.error('Unhandled error:', error);
  return res.status(500).json({ error: 'internal_error' });
}
