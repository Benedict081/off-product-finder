import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NutriScore } from './NutriScore';
import type { ProductSummary } from '@/lib/types';

/**
 * One search result, as a row rather than a card.
 *
 * A grid of large image tiles was the wrong shape for this data: a large share
 * of Open Food Facts products have no photo at all, so the grid filled with
 * empty wells. A row needs only a 48px thumbnail, puts the name — the thing
 * people actually scan — on a consistent left edge, and fits three times as
 * many results on screen.
 *
 * Every field except the barcode can be missing, so each has an explicit
 * fallback rather than rendering an empty gap.
 */
export function ProductRow({ product }: { product: ProductSummary }) {
  const t = useTranslations('product');

  return (
    <Link
      href={`/product/${product.barcode}`}
      className="group flex items-center gap-4 px-2 py-3 transition-colors hover:bg-surface-muted"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded"
      >
        {product.imageUrl !== null ? (
          // Plain <img>: Open Food Facts images come from a single external host
          // and are already sized, so next/image would add a proxy hop for no
          // benefit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-0.5 mix-blend-multiply"
          />
        ) : (
          <span className="text-ink-subtle/60" title={t('noImage')}>
            <PackageIcon />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {product.name?.value ?? t('unnamed')}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {product.brand ?? t('noBrand')}
          {product.quantity !== null && (
            <>
              <span aria-hidden className="mx-1.5 text-line-strong">
                ·
              </span>
              <span className="tabular-nums">{product.quantity}</span>
            </>
          )}
        </p>
      </div>

      {/* The grade is the only colour in the list, so it reads without a label. */}
      <div className="flex w-7 shrink-0 justify-end">
        {product.nutriScore !== null && <NutriScore grade={product.nutriScore} size="sm" />}
      </div>
    </Link>
  );
}

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}
