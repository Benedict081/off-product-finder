/** Mirrors the DTOs the Express API returns. */

export type Locale = 'en' | 'nl' | 'de' | 'fr';

export interface Localized {
  value: string;
  /** `original` means the text is in the product's own, possibly unsupported, language. */
  language: Locale | 'original';
}

export interface ProductSummary {
  barcode: string;
  name: Localized | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriScore: string | null;
}

export interface Nutrient {
  key: string;
  value: number;
  unit: string;
}

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

export interface RecentSearch {
  id: string;
  term: string;
  language: Locale;
  resultCount: number;
  createdAt: string;
}

export interface SubscriptionStatus {
  active: boolean;
  /** The demo user this build acts as. There is no authentication. */
  email: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
