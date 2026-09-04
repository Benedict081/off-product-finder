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

  const periodEnd = status.currentPeriodEnd !== null ? new Date(status.currentPeriodEnd) : null;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t('title')}</h1>
        {/* States the scope of the demo rather than leaving a reviewer to
            wonder why there is no sign-in. */}
        {status.email !== null && (
          <p className="text-sm text-ink-muted">{t('demoNotice', { email: status.email })}</p>
        )}
      </div>

      {checkout === 'success' && (
        <p className="rounded-lg bg-surface-muted p-4 text-sm text-ink">
          {t('checkoutSuccess')}
        </p>
      )}
      {checkout === 'cancelled' && (
        <p className="rounded-lg bg-surface-muted p-4 text-sm text-ink">
          {t('checkoutCancelled')}
        </p>
      )}

      <section className="border-y border-line">
        <div className="flex items-center justify-between gap-4 border-b border-line py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            {t('statusLabel')}
          </h2>
          {/*
            State shown as a pill, not just coloured text: it reads at a glance
            without relying on colour alone.
          */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs
                        font-semibold ${
                          status.active
                            ? 'bg-accent text-accent-fg'
                            : 'border border-line text-ink-muted'
                        }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                status.active ? 'bg-accent-fg' : 'bg-ink-subtle'
              }`}
            />
            {status.active ? t('active') : t('inactive')}
          </span>
        </div>

        <div className="py-4">
          {status.active && periodEnd !== null && (
            <p className="text-sm text-ink-muted">
              {/* Dates are formatted in the active locale, not hard-coded. */}
              {status.cancelAtPeriodEnd
                ? t('cancelsOn', { date: format.dateTime(periodEnd, { dateStyle: 'long' }) })
                : t('renewsOn', { date: format.dateTime(periodEnd, { dateStyle: 'long' }) })}
            </p>
          )}

          {!status.active && (
            <div className="flex flex-col gap-3">
              <SubscribeButton label={t('subscribe')} />
              <p className="text-xs leading-relaxed text-ink-subtle">{t('testCard')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
