'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Puts the search term in the URL rather than in component state, so a result
 * page can be shared, bookmarked and reloaded, and the back button behaves.
 */
export function SearchForm({ initialTerm = '' }: { initialTerm?: string }) {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(initialTerm);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();

    // Mirrors the backend's minimum so the user is told immediately instead of
    // after a round-trip that would only 400.
    if (trimmed.length < 2) {
      setError(t('minLength'));
      return;
    }

    setError(null);
    router.push(`${pathname}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          aria-invalid={error !== null}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-base
                     text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2
                     focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-6 py-3 text-base font-medium text-white
                     transition-colors hover:bg-accent-strong focus:outline-none
                     focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          {t('button')}
        </button>
      </div>
      {error !== null && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
