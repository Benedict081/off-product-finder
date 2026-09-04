import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Redirects a bare path to a locale-prefixed one (/product/1 -> /en/product/1)
 * and remembers the visitor's choice in a cookie, so the manual selector sticks
 * across visits.
 */
export default createMiddleware(routing);

export const config = {
  // Skip Next internals and anything with a file extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
