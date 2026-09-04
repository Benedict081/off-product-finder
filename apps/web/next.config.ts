import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// Points next-intl at the request-scoped config that loads the message catalogue.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Next 16 writes AGENTS.md and CLAUDE.md into this folder on every dev run.
  // They are generated boilerplate, not part of this project.
  agentRules: false,
};

export default withNextIntl(nextConfig);
