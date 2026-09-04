'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Error boundary for the locale routes.
 *
 * Without it, an unhandled render error shows Next.js's default screen — in
 * English, with no way back. Error boundaries must be client components,
 * because they hold the retry handler.
 *
 * `reset()` re-renders the segment, which is a real recovery path here: most
 * failures in this app are a transient Open Food Facts or API hiccup.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');
  const tSearch = useTranslations('search');

  useEffect(() => {
    // The user is shown a generic message; the detail goes to the console for
    // whoever is debugging.
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="text-lg font-semibold text-ink">{t('error')}</h1>
      <p className="text-sm text-ink-muted">{tSearch('error')}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg
                   transition-colors hover:bg-accent-hover"
      >
        {tSearch('button')}
      </button>
    </div>
  );
}
