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
    include: [
      "src/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
      "prisma/**/*.{test,spec}.ts",
    ],
  },
});
