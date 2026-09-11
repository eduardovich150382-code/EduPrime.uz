import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { auth } from '@/lib/auth';

const f = createUploadthing();

export const ourFileRouter = {
  // Savol rasmlari (ustoz panel)
  questionImage: f({
    image: { maxFileSize: '2MB', maxFileCount: 4 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),

  // Variant rasmlari
  optionImage: f({
    image: { maxFileSize: '1MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),

  // Yechim rasmlari
  solutionImage: f({
    image: { maxFileSize: '2MB', maxFileCount: 6 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),

  // AI Import fayllar (PDF, DOCX, TXT, XLSX)
  aiImportFile: f({
    pdf: { maxFileSize: '8MB', maxFileCount: 1 },
    text: { maxFileSize: '4MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url, name: file.name };
  }),

  // Hujjat importining manba fayli. 8 MB (aiImportFile) yetmaydi: 40
  // sahifalik DTM to'plami, ayniqsa skan qilingani, undan oson oshib ketadi
  // va import boshlanmasdan yiqilardi. Manba PDF saqlanadi, chunki ko'rib
  // chiqish ekrani uni brauzerda qayta render qiladi — bu barcha sahifalarni
  // PNG bo'lib saqlashdan arzon.
  importSource: f({
    pdf: { maxFileSize: '32MB', maxFileCount: 1 },
    // PyMuPDF ZIP'idagi manifest.json — hozirgi import yo'lining manbasi.
    'application/json': { maxFileSize: '4MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url, name: file.name };
  }),

  // Importda sahifadan kesib olingan chizma. Yuklash serverdagi UTApi orqali
  // ketadi (assets marshruti), shuning uchun bu ta'rif limit manbai bo'lib
  // qoladi — haqiqiy tekshiruv o'sha marshrutda.
  importAsset: f({
    image: { maxFileSize: '2MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),

  // To'lov cheki (foydalanuvchi)
  paymentReceipt: f({
    image: { maxFileSize: '4MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.url };
  }),

  // Profil rasmi
  avatar: f({
    image: { maxFileSize: '1MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new Error('Unauthorized');
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
