'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/lib/types';

/**
 * The manual language selector.
 *
 * `usePathname` from next-intl returns the path without its locale prefix, so
 * replacing the locale keeps the user on the same page — switching language on
 * a product detail view stays on that product rather than bouncing home.
 */
export function LanguageSwitcher() {
  const t = useTranslations('languages');
  const tSwitcher = useTranslations('languageSwitcher');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(() => {
      // Preserves the query string, so a language switch mid-search re-runs the
      // same search in the new language instead of clearing it.
      const search = typeof window === 'undefined' ? '' : window.location.search;
      router.replace(`${pathname}${search}`, { locale: next as Locale });
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{tSwitcher('label')}</span>
      <select
        value={locale}
        onChange={(event) => onChange(event.target.value)}
        disabled={isPending}
        aria-label={tSwitcher('label')}
        className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink
                   focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
      >
        {routing.locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
