import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SearchForm } from './SearchForm';

const GRADES = [
  { letter: 'a', color: '#038141', ink: '#ffffff' },
  { letter: 'b', color: '#85bb2f', ink: '#ffffff' },
  { letter: 'c', color: '#fecb02', ink: '#18181b' },
  { letter: 'd', color: '#ee8100', ink: '#ffffff' },
  { letter: 'e', color: '#e63e11', ink: '#ffffff' },
];

/**
 * The landing state, shown before anything has been searched.
 *
 * A search field with nothing around it gives a first-time visitor nothing to
 * act on: there is no history yet, and no indication of what the app knows or
 * why part of it is paid. This answers all three — suggestions to click, the
 * Nutri-Score scale explained, and a plain statement of what a subscription
 * adds — without becoming a marketing page.
 *
 * The `id` is what lets the toolbar hide its own compact search here, so the
 * page has one obvious place to type. See globals.css.
 */
export function HomeHero() {
  const t = useTranslations('home');
  const tApp = useTranslations('app');
  const tProduct = useTranslations('product');

  // Suggestions are per-language, so the Dutch page offers Dutch terms — which
  // also demonstrates that search itself is language-aware.
  const suggestions = t.raw('suggestions') as string[];

  return (
    <div id="home-hero" className="flex flex-col gap-14 py-10 sm:py-16">
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">
          {tApp('tagline')}
        </h1>

        <div className="w-full max-w-lg">
          <SearchForm size="lg" />
        </div>

        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm">
          <span className="text-ink-subtle">{t('try')}</span>
          {suggestions.map((term) => (
            <Link
              key={term}
              href={`/?q=${encodeURIComponent(term)}`}
              className="rounded-full border border-line px-3 py-1 text-ink-muted transition-colors
                         hover:border-ink hover:text-ink"
            >
              {term}
            </Link>
          ))}
        </p>
      </section>

      {/*
        The scale is the app's one piece of colour and the thing a user has to
        understand to read a result, so it is explained here rather than left to
        be decoded on a product page.
      */}
      <section
        aria-labelledby="scale-heading"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 border-y border-line py-8"
      >
        <h2
          id="scale-heading"
          className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
        >
          {tProduct('nutriScore')}
        </h2>
        <div className="flex items-center gap-1.5" aria-hidden>
          {GRADES.map(({ letter, color, ink }) => (
            <span
              key={letter}
              style={{ backgroundColor: color, color: ink }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-base font-bold uppercase"
            >
              {letter}
            </span>
          ))}
        </div>
        <p className="text-center text-sm text-ink-muted">{tProduct('nutriScoreHint')}</p>
      </section>

      <section className="mx-auto grid w-full max-w-3xl gap-8 sm:grid-cols-3">
        <Feature title={t('langsTitle')} body={t('langsBody')} />
        <Feature title={t('dataTitle')} body={t('dataBody')} />
        <Feature title={t('nutriTitle')} body={t('nutriBody')} />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
