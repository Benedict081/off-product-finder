import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NutriScoreScale } from '@/components/NutriScore';
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
  const tSearch = await getTranslations({ locale, namespace: 'search' });
  const product = await getProduct(barcode, locale);

  // Open Food Facts does not know this barcode. Rendering the message here
  // rather than through `notFound()` keeps it in the user's language — see the
  // note on getProduct().
  if (product === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <p className="text-3xl font-semibold tabular-nums text-ink-subtle">404</p>
        <h1 className="text-lg font-semibold text-ink">{t('notFound')}</h1>
        <p className="text-sm tabular-nums text-ink-muted">{barcode}</p>
        <Link
          href="/"
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg
                     transition-colors hover:bg-accent-hover"
        >
          {tSearch('button')}
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 py-2">
      <Link
        href="/"
        className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-sm
                   text-ink-muted transition-colors hover:text-ink"
      >
        <span aria-hidden>←</span>
        {t('back')}
      </Link>

      <header className="flex gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden">
          {product.imageUrl !== null ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="max-h-full max-w-full object-contain mix-blend-multiply"
            />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-ink-subtle">
              {t('noImage')}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            {product.name?.value ?? t('unnamed')}
          </h1>
          <p className="text-sm text-ink-muted">
            {product.brand ?? t('noBrand')}
            {product.quantity !== null && (
              <>
                <span aria-hidden className="mx-1.5 text-line-strong">
                  ·
                </span>
                <span className="tabular-nums">{product.quantity}</span>
              </>
            )}
            <span aria-hidden className="mx-1.5 text-line-strong">
              ·
            </span>
            <span className="tabular-nums text-ink-subtle">{product.barcode}</span>
          </p>
          {product.name !== null && (
            <TranslationNote localized={product.name} requested={locale} />
          )}
        </div>
      </header>

      {/* Hairline-separated rows rather than cards: less chrome around what is
          only ever a label and a short value. */}
      {(product.nutriScore !== null || product.allergens.length > 0) && (
        <div className="flex flex-col divide-y divide-line border-y border-line">
          {product.nutriScore !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                {t('nutriScore')}
              </h2>
              {/* The full A–E strip: a lone "E" does not say which end is good. */}
              <NutriScoreScale grade={product.nutriScore} />
            </div>
          )}

          {product.allergens.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 py-3.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                {t('allergens')}
              </h2>
              <ul className="flex flex-wrap gap-1.5">
                {product.allergens.map((allergen) => (
                  <li
                    key={allergen}
                    className="rounded bg-surface-muted px-2 py-0.5 text-xs capitalize text-ink-muted"
                  >
                    {allergen}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {product.ingredients !== null && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
            {t('ingredients')}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
            {product.ingredients.value}
          </p>
          <TranslationNote localized={product.ingredients} requested={locale} />
        </section>
      )}

      <NutritionPanel nutrition={product.nutrition} locked={product.nutritionLocked} />
    </article>
  );
}
