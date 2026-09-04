'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Starts Stripe Checkout.
 *
 * The session is created server-side and this only follows the URL Stripe
 * returns, so no Stripe key or price id ever reaches the browser. The current
 * locale goes along so Checkout renders in the user's language.
 */
export function SubscribeButton({ label }: { label: string }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setIsLoading(true);
    setFailed(false);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });

      if (!response.ok) throw new Error('checkout failed');

      const { url } = (await response.json()) as { url: string };
      window.location.href = url;
    } catch {
      setFailed(true);
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors
                   hover:bg-accent-hover disabled:opacity-50"
      >
        {isLoading ? t('redirecting') : label}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {t('checkoutCancelled')}
        </p>
      )}
    </div>
  );
}
