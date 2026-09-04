import { describe, expect, it } from 'vitest';
import {
  normalizeNutrition,
  normalizeSummary,
  pickLocalized,
} from '../src/services/openFoodFacts.js';

/**
 * Open Food Facts is crowd-sourced, so per-language fields are sparse and a
 * requested translation frequently does not exist. These tests pin down what
 * the user sees when it does not.
 */
describe('pickLocalized', () => {
  it('prefers the requested language', () => {
    const result = pickLocalized(
      { product_name: 'Original', product_name_en: 'English', product_name_nl: 'Nederlands' },
      'product_name',
      'nl',
    );

    expect(result).toEqual({ value: 'Nederlands', language: 'nl' });
  });

  it('falls back to English when the requested language is missing', () => {
    const result = pickLocalized(
      { product_name: 'Original', product_name_en: 'English' },
      'product_name',
      'de',
    );

    // English is the lingua franca across the four supported locales, so it is
    // preferred over the product's own default field.
    expect(result).toEqual({ value: 'English', language: 'en' });
  });

  it("falls back to the product's own language and flags it as original", () => {
    const result = pickLocalized({ product_name: 'Czekolada mleczna' }, 'product_name', 'fr');

    // The bare field can hold any language at all, so it must not be labelled
    // as a translation the UI can trust.
    expect(result).toEqual({ value: 'Czekolada mleczna', language: 'original' });
  });

  it('falls back to another supported language before giving up', () => {
    const result = pickLocalized({ product_name_de: 'Schokolade' }, 'product_name', 'nl');

    expect(result).toEqual({ value: 'Schokolade', language: 'de' });
  });

  it('returns null when no variant holds a value', () => {
    expect(pickLocalized({ code: '123' }, 'product_name', 'en')).toBeNull();
  });

  it('treats empty and whitespace-only values as missing', () => {
    // Open Food Facts routinely stores "" for fields nobody has filled in.
    const result = pickLocalized(
      { product_name_nl: '   ', product_name_en: 'Chocolate' },
      'product_name',
      'nl',
    );

    expect(result).toEqual({ value: 'Chocolate', language: 'en' });
  });
});

describe('normalizeSummary', () => {
  it('normalizes a complete record', () => {
    const summary = normalizeSummary(
      {
        code: '3017620422003',
        product_name_nl: 'Nutella',
        brands: ['Ferrero', 'Nutella'],
        quantity: '400 g',
        image_front_small_url: 'https://images.example/front.jpg',
        nutriscore_grade: 'e',
      },
      'nl',
    );

    expect(summary).toEqual({
      barcode: '3017620422003',
      name: { value: 'Nutella', language: 'nl' },
      brand: 'Ferrero',
      imageUrl: 'https://images.example/front.jpg',
      quantity: '400 g',
      nutriScore: 'e',
    });
  });

  it('survives a record with nothing but a barcode', () => {
    // Real search hits look like this more often than is comfortable.
    const summary = normalizeSummary({ code: '0000000000000' }, 'en');

    expect(summary).toEqual({
      barcode: '0000000000000',
      name: null,
      brand: null,
      imageUrl: null,
      quantity: null,
      nutriScore: null,
    });
  });

  it('drops a record with no barcode, since nothing can link to it', () => {
    expect(normalizeSummary({ product_name: 'Mystery item' }, 'en')).toBeNull();
  });

  it('reads brands as a comma-separated string from the product API', () => {
    // The search API returns an array here and the product API a string.
    const summary = normalizeSummary({ code: '123456789', brands: 'Ferrero, Nutella' }, 'en');

    expect(summary?.brand).toBe('Ferrero');
  });

  it('treats an unknown Nutri-Score as absent', () => {
    const summary = normalizeSummary(
      { code: '123456789', nutriscore_grade: 'unknown', nutrition_grades: 'not-applicable' },
      'en',
    );

    expect(summary?.nutriScore).toBeNull();
  });
});

describe('normalizeNutrition', () => {
  it('extracts known nutrients per 100g with their units', () => {
    const nutrition = normalizeNutrition({
      nutriments: {
        'energy-kcal_100g': 539,
        'energy-kcal_unit': 'kcal',
        fat_100g: 30.9,
        fat_unit: 'g',
        salt_100g: 0.107,
        salt_unit: 'g',
        // Not in our curated list, so it must not leak into the response.
        'nova-group_100g': 4,
      },
    });

    expect(nutrition).toEqual([
      { key: 'energy-kcal', value: 539, unit: 'kcal' },
      { key: 'fat', value: 30.9, unit: 'g' },
      { key: 'salt', value: 0.107, unit: 'g' },
    ]);
  });

  it('returns an empty list when the product has no nutriments at all', () => {
    expect(normalizeNutrition({})).toEqual([]);
    expect(normalizeNutrition({ nutriments: null })).toEqual([]);
  });

  it('skips non-numeric values rather than emitting NaN', () => {
    const nutrition = normalizeNutrition({
      nutriments: { fat_100g: 'not a number', proteins_100g: 6.3 },
    });

    expect(nutrition).toEqual([{ key: 'proteins', value: 6.3, unit: 'g' }]);
  });
});
