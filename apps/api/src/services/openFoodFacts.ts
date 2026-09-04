import { env } from '../config/env.js';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type Language,
  type Localized,
  type Nutrient,
  type ProductDetail,
  type ProductSummary,
  type SearchResult,
} from '../types/product.js';

/** Raw Open Food Facts documents are untyped bags of optional keys. */
type OffRecord = Record<string, unknown>;

export class OpenFoodFactsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OpenFoodFactsError';
  }
}

/* -------------------------------------------------------------------------- */
/* Language resolution                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Order in which we look for a localized field.
 *
 * The requested language wins. English comes next because it is the best
 * lingua franca across our four locales. Only then do we fall back to the
 * product's own default field, which may be in a language we do not support at
 * all (Polish, Spanish, ...) — still better than showing the user nothing.
 */
function candidateKeys(base: string, language: Language): string[] {
  const rest = SUPPORTED_LANGUAGES.filter((l) => l !== language && l !== DEFAULT_LANGUAGE);
  return [
    `${base}_${language}`,
    `${base}_${DEFAULT_LANGUAGE}`,
    base,
    ...rest.map((l) => `${base}_${l}`),
  ];
}

function readString(source: OffRecord, key: string): string | null {
  const raw = source[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve one localized field, reporting which language actually supplied it.
 * Returns null when no variant holds a non-empty value.
 */
export function pickLocalized(
  source: OffRecord,
  base: string,
  language: Language,
): Localized | null {
  for (const key of candidateKeys(base, language)) {
    const value = readString(source, key);
    if (value === null) continue;

    const suffix = key.slice(base.length + 1);
    return {
      value,
      // The bare `base` key carries the product's own language, which we cannot
      // assume is one of ours.
      language: key === base ? 'original' : (suffix as Language),
    };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                              */
/* -------------------------------------------------------------------------- */

/** `brands` is a string on the product API and an array on the search API. */
function readBrand(source: OffRecord): string | null {
  const raw = source['brands'];
  if (Array.isArray(raw)) {
    const first = raw.find((b): b is string => typeof b === 'string' && b.trim().length > 0);
    return first ? first.trim() : null;
  }
  if (typeof raw === 'string') {
    // The product API returns a comma-separated list; the first entry is the
    // primary brand.
    const first = raw.split(',')[0]?.trim();
    return first && first.length > 0 ? first : null;
  }
  return null;
}

function readImage(source: OffRecord): string | null {
  // Ordered smallest-useful-first: grids want the small variant, and not every
  // product has every size.
  for (const key of [
    'image_front_small_url',
    'image_front_url',
    'image_small_url',
    'image_url',
  ]) {
    const value = readString(source, key);
    if (value !== null) return value;
  }
  return null;
}

/** Open Food Facts uses `unknown` / `not-applicable` as present-but-absent. */
function readGrade(source: OffRecord, key: string): string | null {
  const value = readString(source, key)?.toLowerCase() ?? null;
  if (value === null || value === 'unknown' || value === 'not-applicable') return null;
  return value;
}

export function normalizeSummary(source: OffRecord, language: Language): ProductSummary | null {
  const barcode = readString(source, 'code');
  // Without a barcode there is nothing to link to, so the row is unusable.
  if (barcode === null) return null;

  return {
    barcode,
    name: pickLocalized(source, 'product_name', language),
    brand: readBrand(source),
    imageUrl: readImage(source),
    quantity: readString(source, 'quantity'),
    nutriScore: readGrade(source, 'nutriscore_grade') ?? readGrade(source, 'nutrition_grades'),
  };
}

/**
 * The nutrients we surface, in the order a nutrition label prints them.
 * Restricting to a known list keeps the response small and lets the frontend
 * hold a translated label per key.
 */
const NUTRIENT_KEYS = [
  'energy-kcal',
  'fat',
  'saturated-fat',
  'carbohydrates',
  'sugars',
  'fiber',
  'proteins',
  'salt',
  'sodium',
] as const;

export function normalizeNutrition(source: OffRecord): Nutrient[] {
  const raw = source['nutriments'];
  if (typeof raw !== 'object' || raw === null) return [];
  const nutriments = raw as OffRecord;

  const nutrients: Nutrient[] = [];
  for (const key of NUTRIENT_KEYS) {
    // `_100g` is the comparable basis; per-serving values are absent far more
    // often and are not comparable between products.
    const value = nutriments[`${key}_100g`];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;

    const unit = readString(nutriments, `${key}_unit`);
    nutrients.push({
      key,
      value,
      unit: unit ?? (key === 'energy-kcal' ? 'kcal' : 'g'),
    });
  }
  return nutrients;
}

function readTags(source: OffRecord, key: string): string[] {
  const raw = source[key];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === 'string')
    // Tags arrive prefixed with their language, e.g. `en:milk`.
    .map((t) => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim())
    .filter((t) => t.length > 0);
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                        */
/* -------------------------------------------------------------------------- */

async function offFetch(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        // Open Food Facts throttles unidentified clients; see their API policy.
        'User-Agent': env.OFF_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(env.OFF_TIMEOUT_MS),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    throw new OpenFoodFactsError(
      timedOut ? 'Open Food Facts timed out' : 'Could not reach Open Food Facts',
      504,
    );
  }

  if (!response.ok) {
    throw new OpenFoodFactsError(
      `Open Food Facts responded with ${response.status}`,
      response.status === 404 ? 404 : 502,
    );
  }

  try {
    return await response.json();
  } catch {
    // Under load Open Food Facts serves an HTML maintenance page with a 200.
    throw new OpenFoodFactsError('Open Food Facts returned a malformed response', 502);
  }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const SUMMARY_FIELDS = [
  'code',
  'brands',
  'quantity',
  'nutriscore_grade',
  'nutrition_grades',
  'image_front_small_url',
  'image_front_url',
  'image_small_url',
  'image_url',
  'product_name',
  ...SUPPORTED_LANGUAGES.map((l) => `product_name_${l}`),
].join(',');

export interface SearchOptions {
  term: string;
  language: Language;
  page?: number;
  pageSize?: number;
}

/**
 * Full-text search via search-a-licious.
 *
 * `langs` is what makes this language-aware: it points the query at the
 * `product_name.<lang>` analyzer, so "chocolade" matches Dutch products rather
 * than only those whose default name happens to contain the string.
 */
export async function searchProducts({
  term,
  language,
  page = 1,
  pageSize = 24,
}: SearchOptions): Promise<SearchResult> {
  const url = new URL('/search', env.OFF_SEARCH_BASE_URL);
  url.searchParams.set('q', term);
  url.searchParams.set('langs', language);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('fields', SUMMARY_FIELDS);

  const body = (await offFetch(url.toString())) as OffRecord;
  const hits = Array.isArray(body['hits']) ? (body['hits'] as OffRecord[]) : [];

  const products = hits
    .map((hit) => normalizeSummary(hit, language))
    .filter((p): p is ProductSummary => p !== null);

  const totalPages = typeof body['page_count'] === 'number' ? body['page_count'] : 1;

  return { products, page, pageSize, totalPages };
}

/**
 * Fetch one product by barcode.
 *
 * `includeNutrition` is the enforcement point for the paywall: when false the
 * nutrition array is never built, so it cannot leak into the response.
 */
export async function getProduct(
  barcode: string,
  language: Language,
  includeNutrition: boolean,
): Promise<ProductDetail | null> {
  const url = new URL(`/api/v2/product/${encodeURIComponent(barcode)}.json`, env.OFF_PRODUCT_BASE_URL);
  // `lc` also drives which language's front image Open Food Facts returns.
  url.searchParams.set('lc', language);

  const body = (await offFetch(url.toString())) as OffRecord;

  // A missing product comes back as HTTP 200 with status 0, not as a 404.
  if (body['status'] === 0) return null;

  const product = body['product'];
  if (typeof product !== 'object' || product === null) return null;
  const source = product as OffRecord;

  const summary = normalizeSummary(source, language);
  if (summary === null) return null;

  return {
    ...summary,
    ingredients: pickLocalized(source, 'ingredients_text', language),
    categories: pickLocalized(source, 'categories', language),
    allergens: readTags(source, 'allergens_tags'),
    nutritionLocked: !includeNutrition,
    nutrition: includeNutrition ? normalizeNutrition(source) : null,
  };
}
