import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// `src/**`, `scripts/**` va `prisma/**` uchinchisi shu bitta konfiguratsiya
// orqali ishga tushadi — scripts/make-manual-migration.test.ts
// konfiguratsiyasiz avvaldan ishlab turgan, shuning uchun uni includedan
// tushirib qoldirmaslik kerak. `prisma/**` — prisma/seeds/topic-tree.test.ts
// uchun (bazaga ulanishsiz, sof SQL-generatsiya testlari). `@` alias
// src/**/*.ts fayllaridagi "@/..." importlari bilan mos kelishi uchun
// tsconfig.json dagi paths bilan bir xil.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Workerlar soni ataylab cheklangan. Standart holda vitest yadrolar
    // soniga qarab (bu mashinada 18 ta) o'nlab worker ochadi va 98 ta test
    // fayli CPU uchun kurashadi. Eng og'ir testlar — paramgen'ning 200 ta
    // variantni qayta hisoblaydigan testlari — standart 5 s timeout
    // chegarasiga yaqin ishlaydi, shuning uchun yuklama tepaga chiqqanda
    // tasodifan timeout bo'lib qolardi. Cheklov testlarning o'ziga emas,
    // ularga yetarli CPU berishga qaratilgan.
    maxWorkers: 2,
    include: [
      "src/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
      "prisma/**/*.{test,spec}.ts",
    ],
  },
});
