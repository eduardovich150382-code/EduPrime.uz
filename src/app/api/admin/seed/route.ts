import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/admin/seed?secret=eduprime2026 — boshlang'ich ma'lumotlarni DB ga kiritish
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== 'eduprime2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create categories
    const categories = [
      { nameUz: 'DTM testlari', nameRu: 'Тесты ДТМ', nameEn: 'DTM Tests', type: 'DTM' as const, requiredPlan: 'PREMIUM' as const, icon: '🎓', order: 1 },
      { nameUz: 'Maktab testlari', nameRu: 'Школьные тесты', nameEn: 'School Tests', type: 'SCHOOL' as const, requiredPlan: 'PREMIUM' as const, icon: '🏫', order: 2 },
      { nameUz: 'Attestatsiya', nameRu: 'Аттестация', nameEn: 'Attestation', type: 'ATTESTATION' as const, requiredPlan: 'TEACHER_PLAN' as const, icon: '🏆', order: 3 },
      { nameUz: 'SAT', nameRu: 'SAT', nameEn: 'SAT', type: 'SAT' as const, requiredPlan: 'TEACHER_PLAN' as const, icon: '🌍', order: 4 },
      { nameUz: 'GRE Physics', nameRu: 'GRE Physics', nameEn: 'GRE Physics', type: 'GRE' as const, requiredPlan: 'TEACHER_PLAN' as const, icon: '⚛️', order: 5 },
      { nameUz: 'Milliy Sertifikat', nameRu: 'Национальный сертификат', nameEn: 'National Certificate', type: 'CERTIFICATE' as const, requiredPlan: 'PREMIUM' as const, icon: '📜', order: 6 },
    ];

    const createdCategories: any[] = [];
    for (const cat of categories) {
      const existing = await db.testCategory.findFirst({ where: { type: cat.type } });
      if (!existing) {
        const created = await db.testCategory.create({ data: cat });
        createdCategories.push(created);
      } else {
        createdCategories.push(existing);
      }
    }

    // Create subjects
    const subjects = [
      // DTM & School subjects
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐', categoryType: 'DTM' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡', categoryType: 'DTM' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪', categoryType: 'DTM' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬', categoryType: 'DTM' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧', categoryType: 'DTM' },
      { nameUz: 'Ona tili', nameRu: 'Родной язык', nameEn: 'Native language', icon: '📖', categoryType: 'DTM' },
      { nameUz: 'Tarix', nameRu: 'История', nameEn: 'History', icon: '🌍', categoryType: 'DTM' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻', categoryType: 'DTM' },
      { nameUz: 'Rus tili', nameRu: 'Русский язык', nameEn: 'Russian', icon: '🇷🇺', categoryType: 'DTM' },
      // Attestation subjects (same as DTM)
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐', categoryType: 'ATTESTATION' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡', categoryType: 'ATTESTATION' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪', categoryType: 'ATTESTATION' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬', categoryType: 'ATTESTATION' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧', categoryType: 'ATTESTATION' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻', categoryType: 'ATTESTATION' },
      // SAT
      { nameUz: 'SAT Math', nameRu: 'SAT Математика', nameEn: 'SAT Math', icon: '🔢', categoryType: 'SAT' },
      { nameUz: 'SAT Reading & Writing', nameRu: 'SAT Чтение и Письмо', nameEn: 'SAT Reading & Writing', icon: '📝', categoryType: 'SAT' },
      // GRE
      { nameUz: 'GRE Physics', nameRu: 'GRE Физика', nameEn: 'GRE Physics', icon: '⚛️', categoryType: 'GRE' },
      // Certificate
      { nameUz: 'Ingliz tili B2', nameRu: 'Английский B2', nameEn: 'English B2', icon: '🇬🇧', categoryType: 'CERTIFICATE' },
      { nameUz: 'Ingliz tili C1', nameRu: 'Английский C1', nameEn: 'English C1', icon: '🇬🇧', categoryType: 'CERTIFICATE' },
    ];

    let createdSubjects = 0;
    for (const subj of subjects) {
      const category = createdCategories.find(c => c.type === subj.categoryType);
      if (category) {
        const existing = await db.subject.findFirst({
          where: { nameUz: subj.nameUz, categoryId: category.id },
        });
        if (!existing) {
          await db.subject.create({
            data: {
              nameUz: subj.nameUz,
              nameRu: subj.nameRu,
              nameEn: subj.nameEn,
              icon: subj.icon,
              categoryId: category.id,
            },
          });
          createdSubjects++;
        }
      }
    }

    return NextResponse.json({
      message: 'Seed completed!',
      categories: createdCategories.length,
      subjects: createdSubjects,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
  }
}
