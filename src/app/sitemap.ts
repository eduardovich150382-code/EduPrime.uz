import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eduprime.uz';

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ['uz', 'ru', 'en'];
  const now = new Date();

  // Static pages with their priorities
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/login', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/tests', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/rating', priority: 0.7, changeFrequency: 'daily' as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Generate entries for each locale
  for (const page of staticPages) {
    // Default locale (uz) — no prefix needed since localePrefix is 'as-needed'
    entries.push({
      url: `${BASE_URL}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((locale) => [
            locale,
            locale === 'uz'
              ? `${BASE_URL}${page.path}`
              : `${BASE_URL}/${locale}${page.path}`,
          ])
        ),
      },
    });
  }

  return entries;
}
