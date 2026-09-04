import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/Pagination';
import { ProductRow } from '@/components/ProductRow';
import { RecentSearches } from '@/components/RecentSearches';
import { ScoreFilter } from '@/components/ScoreFilter';
import { HomeHero } from '@/components/HomeHero';
import { getRecentSearches, searchProducts } from '@/lib/api';
import type { Locale, ProductSummary, SearchResult } from '@/lib/types';

/**
 * Search page.
 *
 * The term, page number and grade filter all live in the query string, so this
 * stays a server component: the search runs on the server and the results
 * arrive as HTML, with no loading spinner and no API URL in the client bundle.
 * It also means any given view — a filtered page 3 — is a shareable URL.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ q?: string; grade?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, grade, page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'search' });

  const term = q?.trim() ?? '';
  const hasQuery = term.length >= 2;
  const activeGrade = grade?.toLowerCase() ?? null;

  // A hand-edited page number must not reach the API as NaN; the backend caps
  // at 50 pages, so this mirrors that.
  const parsed = Number.parseInt(pageParam ?? '1', 10);
  const page = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 1;

  let results: SearchResult | null = null;
  let failed = false;

  if (hasQuery) {
    try {
      results = await searchProducts(term, locale, page);
    } catch {
      // An upstream outage should degrade this page, not break it.
      failed = true;
    }
  }

  const recent = await getRecentSearches();

  const visible: ProductSummary[] =
    results === null
      ? []
      : activeGrade === null
        ? results.products
        : results.products.filter((p) => p.nutriScore?.toLowerCase() === activeGrade);

  // Nothing searched yet: the landing state, with the history underneath it
  // when there is any.
  if (!hasQuery) {
    return (
      <>
        <HomeHero />
        {recent.length > 0 && (
          <div className="mx-auto w-full max-w-3xl border-t border-line pt-8">
            <RecentSearches searches={recent} horizontal />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
      {/* Sidebar below the results on narrow screens, beside them on desktop. */}
      <aside className="order-2 flex flex-col gap-6 lg:order-1 lg:sticky lg:top-20">
        {results !== null && results.products.length > 0 && (
          <ScoreFilter
            products={results.products}
            term={term}
            active={activeGrade}
            page={page}
          />
        )}
        <RecentSearches searches={recent} />
      </aside>

      <section aria-live="polite" className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="truncate text-base font-semibold text-ink">{term}</h1>
          <p className="shrink-0 text-xs tabular-nums text-ink-muted">
            {t('resultsCount', { count: visible.length })}
          </p>
        </div>

        {failed && (
          <p
            role="alert"
            className="border-y border-line px-4 py-4 text-sm text-ink"
          >
            {t('error')}
          </p>
        )}

        {results !== null && (
          <>
            {visible.length === 0 ? (
              <p className="border-y border-line px-4 py-12 text-center text-sm text-ink-muted">
                {t('noResults', { term })}
              </p>
            ) : (
              /* One bordered container with divided rows, rather than 24
                 separate cards: the list reads as a single object. */
              <ul className="divide-y divide-line border-y border-line">
                {visible.map((product) => (
                  <li key={product.barcode}>
                    <ProductRow product={product} />
                  </li>
                ))}
              </ul>
            )}

            <Pagination
              term={term}
              page={page}
              totalPages={results.totalPages}
              grade={activeGrade}
            />
          </>
        )}
      </section>
    </div>
  );
}
