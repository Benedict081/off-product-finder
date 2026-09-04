import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

/** Pre-renders one route tree per locale at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });

  return { title: t('title'), description: t('tagline') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // A URL like /es/ would otherwise render with fallback messages and a wrong
  // <html lang>; 404 is the honest answer for a locale we do not support.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Required for static rendering: tells next-intl which locale this render is
  // for, since there is no request to infer it from.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'app' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  return (
    // `lang` is what screen readers and the browser's translation prompt use,
    // so it has to track the selector.
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>
          <header className="border-b border-line bg-surface">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
              <Link href="/" className="text-lg font-semibold text-ink hover:text-accent">
                {t('title')}
              </Link>

              <nav className="flex items-center gap-4">
                <Link href="/account" className="text-sm text-ink-muted hover:text-accent">
                  {tNav('account')}
                </Link>
                <LanguageSwitcher />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
