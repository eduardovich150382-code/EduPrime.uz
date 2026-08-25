import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Next.js hali flat config uchun to'liq eslintrc-uslubidagi konfiguratsiya
// tarqatadi (eslint-config-next hali eskirgan eslintrc formatida) — shuning
// uchun FlatCompat orqali "next/core-web-vitals" va "next/typescript" ni
// ESLint 9 flat config'ga ko'chiramiz. Bu — Next.js'ning o'zi tavsiya
// qiladigan rasmiy usul (create-next-app ham xuddi shunday generatsiya
// qiladi).
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global qamrov: faqat src/**, prisma/**/*.ts va scripts/** tekshiriladi.
  // "**/*" bilan hammasi ignore qilinadi, keyin faqat kerakli joylar "!"
  // bilan qaytadan yoqiladi. .next/node_modules/public/bot/ allaqachon shu
  // whitelist'dan tashqarida qoladi — pastdagi qatorlar shuni aniq ko'rsatish
  // uchun qo'shimcha yozilgan (texnik jihatdan ortiqcha, lekin o'qish uchun
  // aniqroq).
  {
    ignores: [
      "**/*",
      "!src/**",
      "!prisma/**/*.ts",
      "!scripts/**",
      ".next/**",
      "node_modules/**",
      "public/**",
      "bot/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "src/**/*.{js,jsx,ts,tsx}",
      "prisma/**/*.ts",
      "scripts/**/*.{js,ts}",
    ],
    rules: {
      // Mavjud kodda `any` juda ko'p ishlatilgan (CLAUDE.md: yangi kodda
      // ishlatilmasin, lekin eskilarni yo'l-yo'lakay tuzatmang). Hozircha
      // `warn` — CI'ni qizartirmaydi, lekin ko'rinib turadi. Eski `any`lar
      // alohida PR'da tozalanib bo'lgach (yoki yangi kodda qat'iy talab
      // qilinadigan bo'lsa), `error`ga ko'tariladi.
      "@typescript-eslint/no-explicit-any": "warn",

      // React hook dependency massivini to'liq talab qilish ko'plab mavjud
      // komponentda amaldagi mantiqqa ataylab qarshi (masalan, faqat
      // mount'da bir marta ishga tushirish). Kodni bu PR doirasida
      // o'zgartirish so'ralmagan, shuning uchun `warn` — muammoli joylar
      // ko'rinadi, lekin build yiqilmaydi. Har bir komponent ko'rib
      // chiqilib, ataylab qoldirilgan holatlar `// eslint-disable-next-line`
      // bilan izohlangach, qoida `error`ga ko'tarilishi mumkin.
      "react-hooks/exhaustive-deps": "warn",

      // Mavjud kodda ~80 joyda oddiy `<a href>` ichki navigatsiya uchun
      // ishlatilgan (`next/link`ning `<Link>` o'rniga). Buni to'g'rilash —
      // har bir joyda import qo'shish va elementni almashtirish, ya'ni
      // navigatsiya xatti-harakatini (client-side transition) o'zgartiradigan,
      // ko'p faylga tarqalgan o'zgarish — bitta lint PR doirasida qilish
      // xavfli. Hozircha `warn`: muammo ko'rinib turadi, lekin build
      // yiqilmaydi. Har bir joy alohida ko'rib chiqilib `<Link>`ga
      // o'tkazilgach, qoida `error`ga qaytariladi.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default eslintConfig;
