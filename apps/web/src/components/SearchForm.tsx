'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

/**
 * Puts the search term in the URL rather than in component state, so a result
 * page can be shared, bookmarked and reloaded, and the back button behaves.
 *
 * It lives in the header and is reachable from every page, so it always
 * navigates to the search route rather than appending a query to whatever page
 * you happen to be on.
 */
export function SearchForm({
  initialTerm = '',
  size = 'sm',
}: {
  initialTerm?: string;
  /** `lg` is the landing-page field; `sm` is the persistent one in the toolbar. */
  size?: 'sm' | 'lg';
}) {
  const t = useTranslations('search');
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);
  const [error, setError] = useState(false);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();

    // Mirrors the backend's minimum so the user is told immediately instead of
    // after a round-trip that would only 400.
    if (trimmed.length < 2) {
      setError(true);
      return;
    }

    setError(false);
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full" role="search">
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-subtle ${
          size === 'lg' ? 'left-4' : 'left-3'
        }`}
      >
        <SearchIcon large={size === 'lg'} />
      </span>

      <input
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          if (error) setError(false);
        }}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        aria-invalid={error}
        className={`w-full min-w-0 rounded-lg border border-line bg-surface text-ink outline-none
                    transition-colors placeholder:text-ink-subtle hover:border-line-strong
                    focus:border-ink [&::-webkit-search-cancel-button]:appearance-none ${
                      size === 'lg'
                        ? 'h-13 pl-12 pr-4 text-base shadow-sm'
                        : 'h-9 pl-9 pr-3 text-sm'
                    }`}
      />

      {error && (
        <p
          role="alert"
          className="absolute left-0 top-full z-10 mt-1 rounded-md border border-line bg-surface
                     px-2 py-1 text-xs text-ink shadow-sm"
        >
          {t('minLength')}
        </p>
      )}
    </form>
  );
}

function SearchIcon({ large = false }: { large?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={large ? 'h-5 w-5' : 'h-4 w-4'}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
