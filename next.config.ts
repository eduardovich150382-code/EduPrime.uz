import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

// Force rebuild with all PRs 49-57 features included
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // S20a — `lib/paramgen/regenerate.ts` (`/api/results/[id]`,
  // `/api/sessions*` orqali) parametrik savol variantlarini `templates.json`
  // va `corpora/*.json`dan RUNTIME'da (`fs.readFileSync`) o'qiydi — Vercel
  // serverless funksiyalarining fayl kuzatuvi (`@vercel/nft`) `__dirname`
  // orqali qurilgan dinamik yo'llarni har doim ham avtomatik topolmaydi,
  // shuning uchun aniq ko'rsatib qo'yamiz — bo'lmasa bu fayllar deploy
  // paketiga tushmay, tushuntirish/ko'rsatma funksiyalari jimgina (xato
  // bermay, faqat bo'sh natija bilan) ishlamay qoladi.
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/lib/paramgen/templates.json', './src/lib/paramgen/corpora/**/*.json'],
  },
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

const config = withNextIntl(nextConfig);

// Sentry o'ramasi faqat DSN berilganda qo'llanadi. Sababi: `withSentryConfig`
// build vaqtida source map yuklash va instrumentatsiya qadamlarini qo'shadi,
// DSN'siz esa bular ortiqcha ish va build logida shovqin. Lokal `next build`
// va CI DSN'siz ishlaydi — o'sha yerda Next konfiguratsiyasi tegilmagan
// holicha qolsin.

// Source map yuklash uchun uchala qiymat ham kerak: qaysi tashkilot va
// loyihaga yuklanishi (`SENTRY_ORG`/`SENTRY_PROJECT`) va yuklash huquqi
// (`SENTRY_AUTH_TOKEN`). Biri yetishmasa yuklash butunlay o'tkazib
// yuboriladi — build yiqilmasin, faqat stack trace'lar minifikatsiyalangan
// holicha qoladi.
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const canUploadSourcemaps = Boolean(sentryOrg && sentryProject && process.env.SENTRY_AUTH_TOKEN);

export default process.env.SENTRY_DSN
  ? withSentryConfig(config, {
      org: sentryOrg,
      project: sentryProject,
      silent: !process.env.CI,
      // Next.js uchun tavsiya etilgan: klient kadrlari to'liqroq yechiladi.
      widenClientFileUpload: true,
      sourcemaps: {
        disable: !canUploadSourcemaps,
        // Yuklangandan keyin `.map` fayllari deploy paketidan o'chirilsin.
        // Aks holda ular ochiq internetdan yuklab olinadi va butun manba
        // kod ko'rinadi.
        deleteSourcemapsAfterUpload: true,
      },
      // Sentry'ning o'z debug logger'i prod bundle'idan chiqarib tashlansin.
      webpack: { treeshake: { removeDebugLogging: true } },
    })
  : config;
