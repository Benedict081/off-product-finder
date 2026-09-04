import { useTranslations } from 'next-intl';
import type { Localized, Locale } from '@/lib/types';

/**
 * Tells the user when the text they are reading is not in the language they
 * asked for.
 *
 * Open Food Facts coverage is uneven, so a Dutch user regularly gets English
 * text. Saying so is more honest than silently presenting it as a translation,
 * and it explains the mixed-language pages a reviewer will inevitably hit.
 */
export function TranslationNote({
  localized,
  requested,
}: {
  localized: Localized;
  requested: Locale;
}) {
  const t = useTranslations('product');
  const tLanguages = useTranslations('languages');

  if (localized.language === requested) return null;

  return (
    // An icon and a little more contrast than a plain grey line: this is an
    // explanation the reader needs, not fine print.
    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-ink-muted">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="mt-px h-3.5 w-3.5 shrink-0 text-ink-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 7.5v.5" />
      </svg>
      <span>
        {t('translationNote', {
          // `original` has no name we can look up: the field could hold any
          // language at all.
          language: localized.language === 'original' ? '—' : tLanguages(localized.language),
          requested: tLanguages(requested),
        })}
      </span>
    </p>
  );
}
