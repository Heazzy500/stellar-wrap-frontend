import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { getSecurityHeaders } from './config/securityHeaders';

const withNextIntl = createNextIntlPlugin(
  './i18n/request.ts'
);

const nextConfig: NextConfig = {
  // Keep any existing configuration options you already have here
  async headers() {
    return [
      {
        // Applies to every route; using headers() here (rather than only
        // vercel.json) means these apply in `next dev` too, not just on
        // Vercel's platform-level routing in production.
        source: '/:path*',
        headers: getSecurityHeaders(process.env.NODE_ENV === 'production'),
      },
    ];
  },
};

// withBundleAnalyzer is a curried factory — (options) => (config) => config
// — not a direct config wrapper; calling it as withBundleAnalyzer(nextConfig)
// passes the config as the options bag and returns a function instead of a
// NextConfig, which withNextIntl then rejects.
export default withNextIntl(
  withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig),
);