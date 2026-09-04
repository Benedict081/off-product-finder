import { useTranslations } from 'next-intl';
import { SubscribeButton } from './SubscribeButton';
import type { Nutrient } from '@/lib/types';

/**
 * The nutrients this app surfaces, in the order a nutrition label prints them.
 * Mirrors NUTRIENT_KEYS on the API. Used here only to name what a subscription
 * unlocks — never to display values, which the API withholds entirely.
 */
const NUTRIENT_KEYS = [
  'energy-kcal',
  'fat',
  'saturated-fat',
  'carbohydrates',
  'sugars',
  'fiber',
  'proteins',
  'salt',
  'sodium',
] as const;

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
        className="border-y border-line"
      >
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="nutrition-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <LockIcon />
              {t('lockedTitle')}
            </h2>
            <p className="max-w-prose text-sm text-ink-muted">{t('lockedBody')}</p>
          </div>
          <div className="shrink-0">
            <SubscribeButton label={t('lockedCta')} />
          </div>
        </div>

        {/*
          Naming the nutrients makes the offer concrete without leaking
          anything: these are our own labels, not this product's values. Rows
          are laid out like the real table so the shape of what you get is
          obvious.
        */}
        <ul className="divide-y divide-line border-t border-line" aria-hidden>
          {NUTRIENT_KEYS.map((key) => {
            const isSubEntry = key === 'saturated-fat' || key === 'sugars';

            return (
              <li
                key={key}
                className={`flex items-center justify-between py-2 text-sm text-ink-subtle ${
                  isSubEntry ? 'pl-4' : ''
                }`}
              >
                {tNutrients(key)}
                <span className="h-1.5 w-10 rounded-full bg-line-strong" />
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (nutrition === null || nutrition.length === 0) {
    // Subscribed, but this particular product has no nutrition data recorded.
    return (
      <section
        aria-labelledby="nutrition-heading"
        className="border-y border-line py-4"
      >
        <h2 id="nutrition-heading" className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{t('unavailable')}</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="nutrition-heading"
      className="border-y border-line"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
        <h2 id="nutrition-heading" className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {t('title')}
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
          {t('per100g')}
        </span>
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-line">
          {nutrition.map((nutrient) => {
            // Saturates and sugars are sub-values of the row above them, as on a
            // printed nutrition label.
            const isSubEntry = nutrient.key === 'saturated-fat' || nutrient.key === 'sugars';

            return (
              <tr key={nutrient.key}>
                <th
                  scope="row"
                  className={`py-2 text-left font-normal ${
                    isSubEntry ? 'pl-4 text-ink-muted' : 'text-ink'
                  }`}
                >
                  {tNutrients(nutrient.key)}
                </th>
                <td className="py-2 text-right font-medium tabular-nums text-ink">
                  {nutrient.value}
                  <span className="ml-1 font-normal text-ink-subtle">{nutrient.unit}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-3.5 w-3.5 text-ink-subtle"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
