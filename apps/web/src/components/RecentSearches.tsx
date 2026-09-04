import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { RecentSearch } from '@/lib/types';

/**
 * The MySQL-backed search history for the demo user.
 *
 * It sits in the sidebar rather than only on the empty state, so a previous
 * search stays one click away while you are reading results.
 */
export function RecentSearches({
  searches,
  horizontal = false,
}: {
  searches: RecentSearch[];
  /** The landing page lays these out in a row; the sidebar stacks them. */
  horizontal?: boolean;
}) {
  const t = useTranslations('search');

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
      <h2
        id="recent-heading"
        className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
      >
        {t('recent')}
      </h2>

      {searches.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('recentEmpty')}</p>
      ) : (
        <ul className={`flex flex-wrap gap-1.5 ${horizontal ? '' : 'lg:flex-col lg:gap-0.5'}`}>
          {searches.map((search) => (
            <li key={search.id}>
              {/*
                Replaying a search restores the language it ran in, since the
                same term returns different results per language.
              */}
              <Link
                href={`/?q=${encodeURIComponent(search.term)}`}
                locale={search.language}
                className={`flex items-center gap-2 text-sm text-ink-muted transition-colors
                            hover:bg-surface-muted hover:text-ink ${
                              horizontal
                                ? 'rounded-full border border-line px-3 py-1 hover:border-ink'
                                : 'rounded-md px-2 py-1.5'
                            }`}
              >
                <span className="truncate">{search.term}</span>
                <span
                  className="ml-auto shrink-0 rounded border border-line px-1 text-[10px]
                             font-medium uppercase tracking-wide text-ink-subtle"
                >
                  {search.language}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
