import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NutriScore } from '@/components/NutriScore';
import { NutritionPanel } from '@/components/NutritionPanel';
import { TranslationNote } from '@/components/TranslationNote';
import { Link } from '@/i18n/navigation';
import { getProduct } from '@/lib/api';
import type { Locale } from '@/lib/types';

/**
 * Product detail.
 *
 * Whether nutrition is shown is decided entirely by the API's `nutritionLocked`
 * flag — this page has no access to the values when locked, so the paywall
 * cannot be defeated from the client.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; barcode: string }>;
}) {
  const { locale, barcode } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'product' });
  const product = await getProduct(barcode, locale);

  return (
    <article className="flex flex-col gap-6">
      <Link href="/" className="self-start text-sm text-ink-muted hover:text-accent">
        ← {t('back')}
      </Link>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="flex aspect-square items-center justify-center rounded-xl border border-line bg-surface p-4">
          {product.imageUrl !== null ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name?.value ?? t('unnamed')}
              className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal"
            />
          ) : (
            <span className="text-center text-sm text-ink-muted">{t('noImage')}</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              {product.name?.value ?? t('unnamed')}
            </h1>
            {product.name !== null && (
              <TranslationNote localized={product.name} requested={locale} />
            )}
            <p className="mt-1 text-ink-muted">{product.brand ?? t('noBrand')}</p>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-muted">{t('quantity')}</dt>
              <dd className="mt-1 text-ink">{product.quantity ?? t('notAvailable')}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('nutriScore')}</dt>
              <dd className="mt-1">
                {product.nutriScore !== null ? (
                  <NutriScore grade={product.nutriScore} />
                ) : (
                  <span className="text-ink">{t('notAvailable')}</span>
                )}
              </dd>
            </div>
          </dl>

          {product.allergens.length > 0 && (
            <div>
              <h2 className="text-sm text-ink-muted">{t('allergens')}</h2>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {product.allergens.map((allergen) => (
                  <li
                    key={allergen}
                    className="rounded-full bg-surface-muted px-2.5 py-1 text-xs capitalize text-ink"
                  >
                    {allergen}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {product.ingredients !== null && (
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold text-ink">{t('ingredients')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{product.ingredients.value}</p>
          <TranslationNote localized={product.ingredients} requested={locale} />
        </section>
      )}

      <NutritionPanel nutrition={product.nutrition} locked={product.nutritionLocked} />
    </article>
  );
}
