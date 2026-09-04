import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { RecentSearch } from '@/lib/types';

/** The MySQL-backed search history for the demo user. */
export function RecentSearches({ searches }: { searches: RecentSearch[] }) {
  const t = useTranslations('search');

  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-2 text-sm font-semibold text-ink-muted">
        {t('recent')}
      </h2>

      {searches.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('recentEmpty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {searches.map((search) => (
            <li key={search.id}>
              {/*
                Replaying a search restores the language it ran in, since the
                same term returns different results per language.
              */}
              <Link
                href={`/?q=${encodeURIComponent(search.term)}`}
                locale={search.language}
                className="inline-flex items-center gap-2 rounded-full border border-line
                           bg-surface px-3 py-1.5 text-sm text-ink transition-colors
                           hover:border-accent hover:text-accent focus:outline-none
                           focus:ring-2 focus:ring-accent"
              >
                {search.term}
                <span className="text-xs uppercase text-ink-muted">{search.language}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
