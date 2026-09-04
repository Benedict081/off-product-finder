import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Public_Sans } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SearchForm } from '@/components/SearchForm';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

/*
 * A humanist sans rather than a geometric one: it keeps long ingredient lists
 * and mixed-language product names legible at small sizes, which is most of
 * what this app renders. Loaded through next/font so it is self-hosted and
 * there is no layout shift while it downloads.
 */
const appFont = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-app',
});

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
    <html lang={locale} className={appFont.variable}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider>
          {/*
            Search lives in the toolbar rather than on the page: it is the app's
            primary action and is reachable from a product page or the account
            screen without navigating home first.
          */}
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight
                           text-ink"
              >
                <Wordmark />
                <span className="hidden sm:inline">{t('title')}</span>
              </Link>

              <div data-header-search className="mx-auto w-full min-w-0 max-w-md">
                <SearchForm />
              </div>

              <nav className="flex shrink-0 items-center gap-1">
                <Link
                  href="/account"
                  className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition-colors
                             hover:bg-surface-muted hover:text-ink"
                >
                  {tNav('account')}
                </Link>
                <LanguageSwitcher />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/** A small mark so the toolbar is not a bare word in the corner. */
function Wordmark() {
  return (
    <span
      aria-hidden
      className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M4 20c0-8 6-13 16-14 0 10-5 15-13 15H4z" strokeLinejoin="round" />
        <path d="M4 20c4-5 8-8 12-9.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
