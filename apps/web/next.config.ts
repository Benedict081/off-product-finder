import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// Points next-intl at the request-scoped config that loads the message catalogue.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Open Food Facts serves every product photo from this host.
    remotePatterns: [{ protocol: 'https', hostname: 'images.openfoodfacts.org' }],
  },
};

export default withNextIntl(nextConfig);
