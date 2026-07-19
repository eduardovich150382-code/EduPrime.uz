import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// Force rebuild with all PRs 49-57 features included
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
      {
        protocol: 'https',
        hostname: '*.uploadthing.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
