import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Previous/next paging over the Open Food Facts result set.
 *
 * The page number lives in the query string like the search term, so a given
 * page is a shareable URL and the back button steps through history normally.
 *
 * Links rather than buttons: this is navigation, so it keeps the page a server
 * component, works without JavaScript, and lets a middle-click open a page in a
 * new tab.
 */
export function Pagination({
  term,
  page,
  totalPages,
  grade,
}: {
  term: string;
  page: number;
  totalPages: number;
  grade: string | null;
}) {
  const t = useTranslations('search');

  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams({ q: term });
    if (target > 1) params.set('page', String(target));
    if (grade !== null) params.set('grade', grade);
    return `/?${params}`;
  };

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label={t('pagination')}
      className="flex items-center justify-between gap-4 border-t border-line pt-3"
    >
      <PageLink href={href(page - 1)} enabled={hasPrevious} label={`← ${t('previous')}`} />

      <p className="text-xs tabular-nums text-ink-muted">
        {t('pageOf', { page, total: totalPages })}
      </p>

      <PageLink href={href(page + 1)} enabled={hasNext} label={`${t('next')} →`} />
    </nav>
  );
}

function PageLink({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  // A disabled anchor is not a real thing, so the boundary renders as plain
  // text that is not focusable rather than a link that goes nowhere.
  if (!enabled) {
    return <span className="px-2.5 py-1.5 text-sm text-ink-subtle">{label}</span>;
  }

  return (
    <Link
      href={href}
      className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink transition-colors
                 hover:bg-surface-muted"
    >
      {label}
    </Link>
  );
}
