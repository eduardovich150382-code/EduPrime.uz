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
