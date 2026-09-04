import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NutriScore } from './NutriScore';
import type { ProductSummary } from '@/lib/types';

/**
 * One search result.
 *
 * Every field except the barcode can be missing, so each has an explicit
 * fallback rather than rendering an empty gap.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const t = useTranslations('product');

  return (
    <Link
      href={`/product/${product.barcode}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface
                 transition-shadow hover:shadow-md focus:outline-none focus:ring-2
                 focus:ring-accent"
    >
      <div className="flex aspect-square items-center justify-center bg-surface-muted p-4">
        {product.imageUrl !== null ? (
          // Plain <img>: Open Food Facts images come from a single external host
          // and are already sized, so next/image would add a proxy hop for no
          // benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name?.value ?? t('unnamed')}
            loading="lazy"
            className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal"
          />
        ) : (
          <span className="px-2 text-center text-xs text-ink-muted">{t('noImage')}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 font-medium text-ink group-hover:text-accent">
          {product.name?.value ?? t('unnamed')}
        </h3>
        <p className="text-sm text-ink-muted">{product.brand ?? t('noBrand')}</p>

        <div className="mt-auto flex items-center justify-between pt-2">
          {product.quantity !== null && (
            <span className="text-xs text-ink-muted">{product.quantity}</span>
          )}
          {product.nutriScore !== null && <NutriScore grade={product.nutriScore} />}
        </div>
      </div>
    </Link>
  );
}
