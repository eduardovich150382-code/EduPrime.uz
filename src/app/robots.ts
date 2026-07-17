import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/profile/',
          '/admin/',
          '/teacher/',
          '/results/',
          '/tests/*/solve',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
