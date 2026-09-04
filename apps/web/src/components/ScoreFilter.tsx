import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/lib/types';

const GRADES = ['a', 'b', 'c', 'd', 'e'] as const;

/**
 * Narrows the results already on screen by Nutri-Score.
 *
 * The filter is a link, not a client-side control: the active grade lives in
 * the query string, so a filtered view is shareable and the back button undoes
 * it. That matches how the search term itself works.
 *
 * It filters the current page of results rather than re-querying — Open Food
 * Facts' search endpoint does not accept a grade facet, so filtering server-
 * side would mean paging through the whole result set. The counts make the
 * scope obvious.
 */
export function ScoreFilter({
  products,
  term,
  active,
  page,
}: {
  products: ProductSummary[];
  term: string;
  active: string | null;
  page: number;
}) {
  const t = useTranslations('search');
  const tProduct = useTranslations('product');

  const counts = new Map<string, number>();
  for (const product of products) {
    const grade = product.nutriScore?.toLowerCase();
    if (grade !== undefined && GRADES.includes(grade as (typeof GRADES)[number])) {
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    }
  }

  const base = (grade: string | null) => {
    const params = new URLSearchParams({ q: term });
    if (page > 1) params.set('page', String(page));
    if (grade !== null) params.set('grade', grade);
    return `/?${params}`;
  };

  return (
    <section aria-labelledby="filter-heading" className="flex flex-col gap-2">
      <h2
        id="filter-heading"
        className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
      >
        {tProduct('nutriScore')}
      </h2>

      <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        <li>
          <FilterLink href={base(null)} selected={active === null} label={t('allGrades')} count={products.length} />
        </li>
        {GRADES.map((grade) => {
          const count = counts.get(grade) ?? 0;
          if (count === 0) return null;

          return (
            <li key={grade}>
              <FilterLink
                href={base(grade)}
                selected={active === grade}
                label={grade.toUpperCase()}
                count={count}
                swatch={grade}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const SWATCHES: Record<string, string> = {
  a: 'bg-[#038141]',
  b: 'bg-[#85bb2f]',
  c: 'bg-[#fecb02]',
  d: 'bg-[#ee8100]',
  e: 'bg-[#e63e11]',
};

function FilterLink({
  href,
  selected,
  label,
  count,
  swatch,
}: {
  href: string;
  selected: boolean;
  label: string;
  count: number;
  swatch?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors
                  ${
                    selected
                      ? 'bg-surface-muted font-medium text-ink'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                  }`}
    >
      {swatch !== undefined && (
        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-sm ${SWATCHES[swatch]}`} />
      )}
      <span className="flex-1">{label}</span>
      <span className="tabular-nums text-xs text-ink-subtle">{count}</span>
    </Link>
  );
}
