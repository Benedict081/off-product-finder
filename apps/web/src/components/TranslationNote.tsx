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
    <p className="mt-1 text-xs text-ink-muted">
      {t('translationNote', {
        // `original` has no name we can look up: the field could hold any
        // language at all.
        language:
          localized.language === 'original' ? '—' : tLanguages(localized.language),
        requested: tLanguages(requested),
      })}
    </p>
  );
}
