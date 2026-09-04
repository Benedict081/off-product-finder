import { stripe } from '../src/services/stripe.js';

/**
 * One-off helper: creates the monthly product and price in Stripe test mode and
 * prints the price id for STRIPE_PRICE_ID.
 *
 * The price lives in Stripe rather than in code because it is account-specific:
 * whoever clones this repo needs one in *their* test account.
 */
async function main() {
  const product = await stripe.products.create({
    name: 'Nutrition Insights (monthly)',
    description: 'Full nutritional values for every product.',
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: 499,
    recurring: { interval: 'month' },
  });

  console.log(`\nAdd this to apps/api/.env:\n\nSTRIPE_PRICE_ID="${price.id}"\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
