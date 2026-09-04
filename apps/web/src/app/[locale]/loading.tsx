import { getTranslations } from 'next-intl/server';

/**
 * Shown while a server render is in flight.
 *
 * Search runs on the server, so without this the browser sits on the previous
 * page for the length of the Open Food Facts round-trip with no acknowledgement
 * that anything happened. The skeleton mirrors the real result list so the
 * layout does not jump when the data lands.
 */
export default async function Loading() {
  const t = await getTranslations('search');

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr] lg:items-start">
      <div aria-hidden className="order-2 hidden flex-col gap-2 lg:order-1 lg:flex">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 animate-pulse rounded-md bg-surface-muted" />
        ))}
      </div>

      <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
        <p role="status" className="text-sm text-ink-muted">
          {t('searching')}
        </p>

        <ul aria-hidden className="divide-y divide-line border-y border-line">
          {[...Array(8)].map((_, i) => (
            <li key={i} className="flex items-center gap-4 px-2 py-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-surface-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* Varied widths so the placeholder does not read as a table. */}
                <div
                  className="h-3.5 animate-pulse rounded bg-surface-muted"
                  style={{ width: `${45 + ((i * 13) % 40)}%` }}
                />
                <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
