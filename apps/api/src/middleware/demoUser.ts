import type { NextFunction, Request, Response } from 'express';
import { getDemoUser } from '../services/demoUser.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Attaches the demo user to every request, standing in for authentication.
 * Routes read `req.userId` and stay unaware of how it was resolved.
 */
export async function attachDemoUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await getDemoUser();
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (error) {
    next(error);
  }
}
