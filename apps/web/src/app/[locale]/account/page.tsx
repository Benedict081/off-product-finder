import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SubscribeButton } from '@/components/SubscribeButton';
import { getSubscriptionStatus } from '@/lib/api';
import type { Locale } from '@/lib/types';

/**
 * Subscription status and the entry point to Stripe Checkout.
 *
 * Stripe redirects back here with ?checkout=success, but the subscription is
 * only actually activated by the webhook, so the page reports "may take a
 * moment" rather than claiming success it cannot yet verify.
 */
export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { locale } = await params;
  const { checkout } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'account' });
  const format = await getFormatter({ locale });
  const status = await getSubscriptionStatus();

  const periodEnd =
    status.currentPeriodEnd !== null ? new Date(status.currentPeriodEnd) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{t('title')}</h1>

      {checkout === 'success' && (
        <p className="rounded-lg border border-accent bg-surface p-4 text-sm text-ink">
          {t('checkoutSuccess')}
        </p>
      )}
      {checkout === 'cancelled' && (
        <p className="rounded-lg border border-line bg-surface p-4 text-sm text-ink">
          {t('checkoutCancelled')}
        </p>
      )}

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-sm text-ink-muted">{t('statusLabel')}</h2>

        <p className="mt-1 flex items-center gap-2 text-lg font-medium text-ink">
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              status.active ? 'bg-accent' : 'bg-ink-muted'
            }`}
          />
          {status.active ? t('active') : t('inactive')}
        </p>

        {status.active && periodEnd !== null && (
          <p className="mt-2 text-sm text-ink-muted">
            {/* Dates are formatted in the active locale, not hard-coded. */}
            {status.cancelAtPeriodEnd
              ? t('cancelsOn', { date: format.dateTime(periodEnd, { dateStyle: 'long' }) })
              : t('renewsOn', { date: format.dateTime(periodEnd, { dateStyle: 'long' }) })}
          </p>
        )}

        {!status.active && (
          <div className="mt-4">
            <SubscribeButton label={t('subscribe')} />
            <p className="mt-3 text-xs text-ink-muted">{t('testCard')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
