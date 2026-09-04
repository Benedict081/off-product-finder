import { useTranslations } from 'next-intl';
import { SubscribeButton } from './SubscribeButton';
import type { Nutrient } from '@/lib/types';

/**
 * The paywalled section.
 *
 * When `locked` the API has already withheld the numbers, so there is nothing
 * here to hide — this component renders the upsell because it has no data, not
 * to conceal data it was given.
 */
export function NutritionPanel({
  nutrition,
  locked,
}: {
  nutrition: Nutrient[] | null;
  locked: boolean;
}) {
  const t = useTranslations('nutrition');
  const tNutrients = useTranslations('nutrients');

  if (locked) {
    return (
      <section
        aria-labelledby="nutrition-heading"
        className="rounded-xl border border-dashed border-line bg-surface p-6 text-center"
      >
        <h2 id="nutrition-heading" className="text-lg font-semibold text-ink">
          {t('lockedTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t('lockedBody')}</p>
        <div className="mt-4 flex justify-center">
          <SubscribeButton label={t('lockedCta')} />
        </div>
      </section>
    );
  }

  if (nutrition === null || nutrition.length === 0) {
    // Subscribed, but this particular product has no nutrition data recorded.
    return (
      <section aria-labelledby="nutrition-heading" className="rounded-xl border border-line bg-surface p-6">
        <h2 id="nutrition-heading" className="text-lg font-semibold text-ink">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{t('unavailable')}</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="nutrition-heading"
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      <div className="flex items-baseline justify-between border-b border-line px-6 py-4">
        <h2 id="nutrition-heading" className="text-lg font-semibold text-ink">
          {t('title')}
        </h2>
        <span className="text-sm text-ink-muted">{t('per100g')}</span>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {nutrition.map((nutrient) => {
            // Saturates and sugars are sub-values of the row above them, as on a
            // printed nutrition label.
            const isSubEntry = nutrient.key === 'saturated-fat' || nutrient.key === 'sugars';

            return (
              <tr key={nutrient.key} className="border-b border-line last:border-0">
                <th
                  scope="row"
                  className={`px-6 py-3 text-left font-normal text-ink ${
                    isSubEntry ? 'pl-10 text-ink-muted' : ''
                  }`}
                >
                  {tNutrients(nutrient.key)}
                </th>
                <td className="px-6 py-3 text-right font-medium tabular-nums text-ink">
                  {nutrient.value} {nutrient.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
