# Food Finder

Search packaged food products from [Open Food Facts](https://openfoodfacts.org) in
English, Dutch, German and French. Names, brands and photos are free to everyone;
detailed nutritional values require an active Stripe subscription.

```
apps/
  api/   Express + Prisma + MySQL   — Open Food Facts proxy, Stripe, gating
  web/   Next.js + React + Tailwind — localized UI
```

### What it does

- **Search** Open Food Facts in English, Dutch, German or French, with the query
  pointed at that language's analyzer rather than a single global index.
- **Browse results** as a paged list, narrowable by Nutri-Score, with the term,
  page and filter all in the URL so any view is shareable.
- **Read a product** — photo, brand, quantity, allergens, ingredients and the
  full Nutri-Score scale — in the selected language, with a note whenever a
  field falls back to another language.
- **Unlock nutritional values** with a Stripe subscription. Without one the
  numbers are never sent to the client at all.
- **Recent searches** are stored per user in MySQL and replay in the language
  they were run in.

---

## Setup

### 1. Requirements

- Node.js 20 or newer
- A MySQL 8 server
- A Stripe account in **test mode**

### 2. Install

```bash
git clone <this repo>
cd off-product-finder
npm install
```

> **If you are on npm 11.** npm 11 blocks package lifecycle scripts by default,
> and Prisma needs its postinstall to fetch its query engines — without it the
> package is skipped and `prisma` never appears in `node_modules/.bin`. The
> approvals are committed in the root `package.json` under `allowScripts`, but if
> `npm install` still warns about pending install scripts, run:
>
> ```bash
> npm approve-scripts --all
> npm install
> ```
>
> Older npm versions run these scripts automatically and need none of this.

### 3. Database

```bash
mysql -u root -e "CREATE DATABASE off_finder;"
```

### 4. Environment

```bash
cp .env.example apps/api/.env
```

Fill in `DATABASE_URL` and the Stripe values. Then create the monthly price in
your own Stripe test account and copy the id it prints into `STRIPE_PRICE_ID`:

```bash
npm run stripe:price -w apps/api
```

The frontend needs one variable of its own:

```bash
echo 'API_BASE_URL="http://localhost:4000"' > apps/web/.env.local
```

### 5. Migrate and seed

```bash
npm run db:migrate      # applies prisma/migrations
npm run db:seed         # creates the single demo user
```

### 6. Run

```bash
npm run dev             # API on :4000, web on :3000
```

Open <http://localhost:3000> — you will be redirected to `/en`.

### 7. Stripe webhooks

Subscriptions only activate when the webhook arrives, so forward events while
developing:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` and restart the API.
Pay with card `4242 4242 4242 4242`, any future expiry, any CVC.

### Tests

```bash
npm test
```

---

## Technical decisions

### Nutrition is withheld by the API, not hidden by the UI

The paywall is enforced in `GET /api/products/:barcode`. Without an active
subscription the response contains `nutritionLocked: true` and `nutrition: null`,
and the values are never serialized at all — `getProduct()` takes an
`includeNutrition` flag and simply does not build the array.

Rendering the numbers and blurring them in CSS would have been less code and
would have failed the requirement: anyone could read them in devtools. The test
`tests/gating.test.ts` asserts on the absence of the numbers in the response
body for exactly this reason.

### Stripe is the source of truth; MySQL holds a read-model

The `subscriptions` table mirrors the Stripe subscription object and is kept
current by the webhook handler. Access checks then cost one indexed query
instead of a Stripe API round-trip on every page view.

`active` and `trialing` unlock content. `past_due` deliberately does not — Stripe
is still retrying the card at that point, and treating it as active would give
away paid content on a payment that may never succeed.

### Webhooks are verified and idempotent

- `express.raw()` is mounted on the webhook route **before** `express.json()`.
  Signature verification hashes the exact bytes Stripe sent, and a JSON
  round-trip would re-serialize them and break the signature.
- Stripe guarantees at-least-once delivery. The handler inserts the event id
  into `processed_events` first; the unique constraint turns a redelivery into a
  no-op before any state is touched.
- If handling then fails, the claim is deleted so Stripe's retry can genuinely
  reprocess. Without that, a transient database error would leave a paying
  customer permanently locked out.

### Search uses search-a-licious, not the legacy CGI endpoint

`search.openfoodfacts.org` accepts a `langs` parameter that points the query at
the `product_name.<lang>` analyzer. Searching "chocolade" with `langs=nl`
therefore matches Dutch products, which the legacy `/cgi/search.pl` endpoint
cannot do. Product detail still uses the stable `/api/v2/product/<barcode>.json`,
where `lc` selects both the text fields and the localized front image.

### Prisma 6, not 7

Prisma 7 removed `url` from the schema and requires a `prisma.config.ts` plus a
driver adapter. Prisma 6 keeps the familiar `url = env("DATABASE_URL")` setup
that most reviewers can read at a glance, which matters more here than being on
the newest major. Both `prisma` and `@prisma/client` are pinned to the same exact
version, because npm's `latest` tag currently points at a Prisma 8 release
candidate and a mismatched pair fails at runtime.

### "Product not found" is rendered by the page, not by `notFound()`

Next's `notFound()` helper renders the nearest `not-found.tsx`. In this App
Router setup only the **root** one is ever reached, and it sits outside the
`[locale]` segment — so an unknown barcode produced an English "Page not found"
inside `<html lang="nl">`. Placing a `not-found.tsx` at `[locale]/`, and then
inside the product segment itself, made no difference.

`getProduct()` therefore returns `null` on a 404 and the page renders the message
itself, in the user's language, keeping the header so they can search again. The
trade-off is a 200 response where a 404 would be more correct; on a page a person
reads, in an assignment about internationalization, the right language is worth
more than the status code.

### One light theme rather than following the system setting

Open Food Facts photography is shot on white and sits badly on a dark ground,
and the Nutri-Score colours are a published standard specified against white.
The palette is otherwise near-monochrome, so the grade badges are the only
saturated colour in the interface and read at a glance. Components reference
intent (`text-ink`, `border-line`) rather than literal colours, so adding dark
mode back means redefining those tokens in one media query and changing no
components.

### Server components, so the API URL never ships to the browser

Searches and product pages are rendered on the Next.js server, which calls
Express directly. The only browser-initiated call is the subscribe button, which
goes through `app/api/checkout` so that no Stripe key, price id, or backend URL
reaches the client bundle.

---


## Automated tests

`npm test` runs the backend suite (Vitest + Supertest). Open Food Facts and
Stripe are mocked at their module boundaries, so the suite needs no network and
no database and runs on a clean checkout.

| File | What it protects |
| --- | --- |
| `tests/language.test.ts` | The fallback chain, and that missing/empty/whitespace fields degrade instead of throwing |
| `tests/openFoodFacts.test.ts` | `langs`/`lc` are actually sent, the User-Agent identifies us, timeouts become 504s, and an HTML maintenance page served with a 200 is rejected |
| `tests/gating.test.ts` | The paywall: nutrition numbers are absent from the payload without a subscription and present with one |
| `tests/searches.test.ts` | Searches are recorded with their language, a logging failure does not cost the user results, and history is deduplicated |
| `tests/webhook.test.ts` | Bad signatures are rejected, subscriptions sync, redeliveries are no-ops, and a failed handler releases its idempotency claim |

---

## Known limitations and simplifications

- **No authentication.** The assignment specifies one demo user, so
  `attachDemoUser` upserts a fixed user on every request. Routes already take a
  `userId`, so adding real sessions means changing that middleware and nothing
  else.
- **No database in the test suite.** Prisma is mocked at the client boundary.
  The tests cover our logic, not our SQL; the migration is verified by applying
  it, not by a test.
- **Open Food Facts data quality varies.** Many products have no photo, no
  brand, no quantity, or no nutrition data at all. This is handled everywhere it
  can be, but a sparse product page is the data, not a bug.
- **The search index lags the product database.** search-a-licious is rebuilt
  periodically, so a very recently edited product may return stale fields in
  search results while its detail page is current.
- **The Nutri-Score filter narrows the current page, not the whole result set.**
  search-a-licious has no grade facet, so filtering server-side would mean paging
  through every result. The filter shows a count beside each grade to make its
  scope obvious.
- **No caching.** Every request hits Open Food Facts. A cache keyed on
  `(barcode, language)` is the obvious next step; the service is already the
  single choke point for it.
- **The success page cannot confirm the subscription.** Stripe redirects back
  before the webhook necessarily arrives, so the page says the subscription
  "may take a moment to appear" rather than asserting success it cannot verify.
- **Single Stripe price, hard-coded currency.** The price is created in EUR by
  `stripe:price`; there is no per-locale pricing.
- **No rate limiting** on the API, which would be needed before exposing it
  publicly given it proxies a third-party service that asks for polite use.
