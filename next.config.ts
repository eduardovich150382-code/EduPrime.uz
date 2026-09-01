import createNextIntlPlugin from 'next-intl/plugin';
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

export default withNextIntl(nextConfig);
