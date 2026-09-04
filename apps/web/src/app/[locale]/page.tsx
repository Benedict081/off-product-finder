import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProductCard } from '@/components/ProductCard';
import { RecentSearches } from '@/components/RecentSearches';
import { SearchForm } from '@/components/SearchForm';
import { getRecentSearches, searchProducts } from '@/lib/api';
import type { Locale, SearchResult } from '@/lib/types';

/**
 * Search page.
 *
 * The term lives in the query string, so this stays a server component: the
 * search runs on the server and the results arrive as HTML, with no loading
 * spinner and no API URL in the client bundle.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'search' });
  const tApp = await getTranslations({ locale, namespace: 'app' });

  const term = q?.trim() ?? '';
  const hasQuery = term.length >= 2;

  let results: SearchResult | null = null;
  let failed = false;

  if (hasQuery) {
    try {
      results = await searchProducts(term, locale);
    } catch {
      // An upstream outage should degrade this page, not break it.
      failed = true;
    }
  }

  const recent = await getRecentSearches();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{tApp('title')}</h1>
        <p className="text-ink-muted">{tApp('tagline')}</p>
        <SearchForm initialTerm={term} />
      </div>

      {!hasQuery && <RecentSearches searches={recent} />}

      {failed && (
        <p role="alert" className="rounded-lg border border-line bg-surface p-4 text-ink">
          {t('error')}
        </p>
      )}

      {results !== null && (
        <section aria-live="polite">
          <p className="mb-4 text-sm text-ink-muted">
            {t('resultsCount', { count: results.products.length })}
          </p>

          {results.products.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface p-4 text-ink">
              {t('noResults', { term })}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.products.map((product) => (
                <li key={product.barcode} className="contents">
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
