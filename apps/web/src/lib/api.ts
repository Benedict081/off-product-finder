import type {
  Locale,
  ProductDetail,
  RecentSearch,
  SearchResult,
  SubscriptionStatus,
} from './types';

/**
 * Server-side base URL for the Express API.
 *
 * Every call in this file runs on the Next.js server, never in the browser, so
 * the API host is not a NEXT_PUBLIC_ variable and stays out of the client
 * bundle. Browser-initiated actions go through the route handlers in app/api.
 */
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    // Product data changes rarely but subscription state must never be stale,
    // so nothing here is cached by default.
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed`, response.status);
  }

  return (await response.json()) as T;
}

export function searchProducts(term: string, locale: Locale, page = 1): Promise<SearchResult> {
  const params = new URLSearchParams({ q: term, lang: locale, page: String(page) });
  return apiFetch<SearchResult>(`/api/products/search?${params}`);
}

/**
 * Returns null when Open Food Facts does not know the barcode, so the page can
 * render a localized "not found" state.
 *
 * This deliberately does not call Next's `notFound()`. That helper renders the
 * nearest `not-found.tsx`, and in this App Router setup only the root one is
 * ever reached — which sits outside the `[locale]` segment and therefore has no
 * translations, producing an English page inside `<html lang="nl">`. Handling
 * it in the page keeps the message in the user's language and keeps the header
 * on screen so they can search again. The trade-off is that the response is a
 * 200 rather than a 404; for a page a person reads, the localized message is
 * worth more than the status code.
 */
export async function getProduct(
  barcode: string,
  locale: Locale,
): Promise<ProductDetail | null> {
  try {
    return await apiFetch<ProductDetail>(`/api/products/${barcode}?lang=${locale}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Recent searches and subscription status are decorative relative to the page
 * they sit on: if the API is down the page should still render, just without
 * them.
 */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const { searches } = await apiFetch<{ searches: RecentSearch[] }>('/api/searches/recent');
    return searches;
  } catch {
    return [];
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    return await apiFetch<SubscriptionStatus>('/api/billing/status');
  } catch {
    // Failing closed keeps the paywall intact if billing status is unavailable.
    return {
      active: false,
      email: null,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }
}

export async function createCheckoutSession(locale: Locale): Promise<string> {
  const { url } = await apiFetch<{ url: string }>('/api/billing/checkout-session', {
    method: 'POST',
    body: JSON.stringify({ language: locale }),
  });
  return url;
}
