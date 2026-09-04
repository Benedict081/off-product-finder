import { defineRouting } from 'next-intl/routing';

/**
 * The four locales the assignment requires.
 *
 * `localePrefix: 'always'` puts the language in the URL (/nl/product/123), so a
 * page in a given language is linkable, shareable and cacheable. The selector
 * then only has to rewrite the path.
 */
export const routing = defineRouting({
  locales: ['en', 'nl', 'de', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
