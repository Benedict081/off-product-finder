import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/api';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/lib/types';

/**
 * Browser-facing endpoint for the subscribe button.
 *
 * The button cannot call Express directly without exposing its URL to the
 * client bundle, so this handler brokers the call from the Next.js server and
 * returns just the Stripe redirect URL.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = (
    routing.locales.includes(body.locale as Locale) ? body.locale : routing.defaultLocale
  ) as Locale;

  try {
    const url = await createCheckoutSession(locale);
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Could not create checkout session:', error);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }
}
