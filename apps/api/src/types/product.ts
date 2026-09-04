/** The four locales the assignment requires. */
export const SUPPORTED_LANGUAGES = ['en', 'nl', 'de', 'fr'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isSupportedLanguage(value: unknown): value is Language {
  return (
    typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * A localized string plus the language it actually came from.
 *
 * Open Food Facts is crowd-sourced and its per-language fields are sparse, so a
 * Dutch user regularly gets an English or original-language name. Carrying the
 * resolved language lets the UI say so honestly ("shown in English") instead of
 * silently implying the text is a translation.
 */
export interface Localized {
  value: string;
  language: Language | 'original';
}

/** One row in the search results grid. Never contains nutrition data. */
export interface ProductSummary {
  barcode: string;
  name: Localized | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriScore: string | null;
}

export interface Nutrient {
  /** Stable key such as `energy-kcal`; the UI owns the translated label. */
  key: string;
  value: number;
  unit: string;
}

/**
 * Product detail. `nutrition` is null and `nutritionLocked` true for users
 * without an active subscription — the data is omitted by the API rather than
 * hidden by the client.
 */
export interface ProductDetail extends ProductSummary {
  ingredients: Localized | null;
  categories: Localized | null;
  allergens: string[];
  nutritionLocked: boolean;
  nutrition: Nutrient[] | null;
}

export interface SearchResult {
  products: ProductSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
}
