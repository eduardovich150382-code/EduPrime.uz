/**
 * JSON-LD Structured Data components for SEO.
 * Renders Schema.org markup in script tags for Google rich results.
 */

interface JsonLdProps {
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Organization schema for the landing page.
 */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'EduPrime.uz',
    url: 'https://eduprime.uz',
    logo: 'https://eduprime.uz/icon.svg',
    description:
      "O'zbekistondagi eng zamonaviy test platformasi — DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlari.",
    foundingDate: '2024',
    areaServed: {
      '@type': 'Country',
      name: 'Uzbekistan',
    },
    sameAs: [
      'https://t.me/EduPrimeuz',
      'https://t.me/EduPrimeuzbot',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Uzbek', 'Russian', 'English'],
      url: 'https://t.me/EduPrimeuz',
    },
  };

  return <JsonLd data={data} />;
}

/**
 * WebApplication schema for the platform.
 */
export function WebApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EduPrime.uz',
    url: 'https://eduprime.uz',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    offers: [
      {
        '@type': 'Offer',
        name: 'Bepul',
        price: '0',
        priceCurrency: 'UZS',
        description: "Cheklangan DTM va maktab testlari",
      },
      {
        '@type': 'Offer',
        name: 'Premium',
        price: '29000',
        priceCurrency: 'UZS',
        description: "DTM + Maktab + Sertifikat testlari — cheksiz",
        billingDuration: 'P1M',
      },
      {
        '@type': 'Offer',
        name: 'Ustoz',
        price: '29000',
        priceCurrency: 'UZS',
        description: "Attestatsiya + SAT + GRE + Sertifikat testlari",
        billingDuration: 'P1M',
      },
    ],
    featureList: [
      'DTM testlari',
      'Maktab testlari',
      'Attestatsiya testlari',
      'SAT testlari',
      'GRE Physics testlari',
      'Milliy sertifikat testlari',
      'Video yechimlar',
      'LaTeX formulalar',
      'Reyting tizimi',
      'AI bilan test import',
    ],
    inLanguage: ['uz', 'ru', 'en'],
    author: {
      '@type': 'Organization',
      name: 'EduPrime.uz',
    },
  };

  return <JsonLd data={data} />;
}

/**
 * FAQPage schema — for landing page FAQ section (if exists) or general questions.
 */
export function FAQJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: "EduPrime.uz nima?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "EduPrime.uz — O'zbekistondagi zamonaviy online test platformasi. DTM, maktab, attestatsiya, SAT, GRE va Milliy sertifikat testlarini yechish, video yechimlar olish va reyting tizimida qatnashish imkoniyati.",
        },
      },
      {
        '@type': 'Question',
        name: 'Qanday test turlari mavjud?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Platformada 6 xil test turi mavjud: DTM (5 fan, 30 savol), Maktab testlari, Attestatsiya (50 savol), SAT (Math + Reading), GRE Physics (70 savol), Milliy sertifikat (35 test + 20 ochiq savol).",
        },
      },
      {
        '@type': 'Question',
        name: "Ro'yxatdan o'tish bepulmi?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Ha, ro'yxatdan o'tish butunlay bepul. Telegram yoki Google orqali 30 soniyada kirish mumkin. Bepul tarifda cheklangan miqdorda testlar yechish imkoniyati bor.",
        },
      },
      {
        '@type': 'Question',
        name: "Premium tarif narxi qancha?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Premium tarif oyiga 29,000 so'm. 6 oylik — 150,000 so'm (17% tejash), 1 yillik — 270,000 so'm (22% tejash). To'lov Telegram bot orqali amalga oshiriladi.",
        },
      },
    ],
  };

  return <JsonLd data={data} />;
}

/**
 * BreadcrumbList schema for navigation context.
 */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
