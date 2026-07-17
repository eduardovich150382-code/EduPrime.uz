import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * EduPrime.uz — Fanlar va Kategoriyalar Seed
 * Bu skript barcha kategoriyalar va ularning fanlarini DB ga yozadi.
 * Ishlatish: npx ts-node prisma/seed.ts
 */

const categories = [
  {
    nameUz: 'DTM',
    nameRu: 'ЕНТ',
    nameEn: 'DTM',
    type: 'DTM',
    requiredPlan: 'PREMIUM',
    icon: '🎓',
    description: 'Davlat test markazi imtihonlari',
    order: 1,
    subjects: [
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬' },
      { nameUz: 'Ona tili va adabiyot', nameRu: 'Родной язык и литература', nameEn: 'Native Language & Literature', icon: '📖' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧' },
      { nameUz: 'Tarix', nameRu: 'История', nameEn: 'History', icon: '🏛️' },
      { nameUz: 'Geografiya', nameRu: 'География', nameEn: 'Geography', icon: '🌍' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻' },
      { nameUz: 'Rus tili', nameRu: 'Русский язык', nameEn: 'Russian Language', icon: '🇷🇺' },
      { nameUz: 'Huquqshunoslik', nameRu: 'Правоведение', nameEn: 'Law', icon: '⚖️' },
    ],
  },
  {
    nameUz: 'Maktab',
    nameRu: 'Школа',
    nameEn: 'School',
    type: 'SCHOOL',
    requiredPlan: 'PREMIUM',
    icon: '🏫',
    description: 'Maktab fanlar bo\'yicha testlar',
    order: 2,
    subjects: [
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐' },
      { nameUz: 'Algebra', nameRu: 'Алгебра', nameEn: 'Algebra', icon: '🔢' },
      { nameUz: 'Geometriya', nameRu: 'Геометрия', nameEn: 'Geometry', icon: '📏' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬' },
      { nameUz: 'Tarix', nameRu: 'История', nameEn: 'History', icon: '🏛️' },
      { nameUz: 'Geografiya', nameRu: 'География', nameEn: 'Geography', icon: '🌍' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧' },
      { nameUz: 'Rus tili', nameRu: 'Русский язык', nameEn: 'Russian Language', icon: '🇷🇺' },
      { nameUz: 'Ona tili va adabiyot', nameRu: 'Родной язык и литература', nameEn: 'Native Language & Literature', icon: '📖' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻' },
      { nameUz: 'Jismoniy tarbiya', nameRu: 'Физкультура', nameEn: 'Physical Education', icon: '⚽' },
      { nameUz: 'Musiqa', nameRu: 'Музыка', nameEn: 'Music', icon: '🎵' },
    ],
  },
  {
    nameUz: 'Attestatsiya',
    nameRu: 'Аттестация',
    nameEn: 'Attestation',
    type: 'ATTESTATION',
    requiredPlan: 'TEACHER_PLAN',
    icon: '🏆',
    description: 'O\'qituvchilar attestatsiyasi',
    order: 3,
    subjects: [
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧' },
      { nameUz: 'Tarix', nameRu: 'История', nameEn: 'History', icon: '🏛️' },
      { nameUz: 'Geografiya', nameRu: 'География', nameEn: 'Geography', icon: '🌍' },
      { nameUz: 'Boshlang\'ich sinf', nameRu: 'Начальные классы', nameEn: 'Primary School', icon: '🎒' },
      { nameUz: 'Jismoniy tarbiya', nameRu: 'Физкультура', nameEn: 'Physical Education', icon: '⚽' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻' },
      { nameUz: 'Ona tili va adabiyot', nameRu: 'Родной язык и литература', nameEn: 'Native Language & Literature', icon: '📖' },
      { nameUz: 'Rus tili va adabiyot', nameRu: 'Русский язык и литература', nameEn: 'Russian Language & Literature', icon: '🇷🇺' },
      { nameUz: 'Musiqa', nameRu: 'Музыка', nameEn: 'Music', icon: '🎵' },
      { nameUz: 'Tasviriy san\'at', nameRu: 'Изобразительное искусство', nameEn: 'Art', icon: '🎨' },
      { nameUz: 'Texnologiya', nameRu: 'Технология', nameEn: 'Technology', icon: '🔧' },
    ],
  },
  {
    nameUz: 'Prezident maktabi',
    nameRu: 'Президентская школа',
    nameEn: 'Presidential School',
    type: 'PRESIDENT_SCHOOL',
    requiredPlan: 'PREMIUM',
    icon: '🏛️',
    description: 'Prezident maktablariga kirish imtihoni',
    order: 4,
    subjects: [
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐' },
      { nameUz: 'Mantiqiy fikrlash', nameRu: 'Логическое мышление', nameEn: 'Logical Thinking', icon: '🧠' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧' },
      { nameUz: 'Ona tili', nameRu: 'Родной язык', nameEn: 'Native Language', icon: '📖' },
      { nameUz: 'Tabiatshunoslik', nameRu: 'Естествознание', nameEn: 'Natural Science', icon: '🌱' },
    ],
  },
  {
    nameUz: 'SAT',
    nameRu: 'SAT',
    nameEn: 'SAT',
    type: 'SAT',
    requiredPlan: 'TEACHER_PLAN',
    icon: '🌐',
    description: 'SAT xalqaro imtihoniga tayyorgarlik',
    order: 5,
    subjects: [
      { nameUz: 'SAT Math', nameRu: 'SAT Math', nameEn: 'SAT Math', icon: '🔢' },
      { nameUz: 'SAT Reading & Writing', nameRu: 'SAT Reading & Writing', nameEn: 'SAT Reading & Writing', icon: '📝' },
    ],
  },
  {
    nameUz: 'GRE',
    nameRu: 'GRE',
    nameEn: 'GRE',
    type: 'GRE',
    requiredPlan: 'TEACHER_PLAN',
    icon: '⚛️',
    description: 'GRE Physics imtihoniga tayyorgarlik',
    order: 6,
    subjects: [
      { nameUz: 'GRE Physics', nameRu: 'GRE Physics', nameEn: 'GRE Physics', icon: '⚡' },
      { nameUz: 'GRE Math', nameRu: 'GRE Math', nameEn: 'GRE Math', icon: '📐' },
    ],
  },
  {
    nameUz: 'Milliy sertifikat',
    nameRu: 'Национальный сертификат',
    nameEn: 'National Certificate',
    type: 'CERTIFICATE',
    requiredPlan: 'PREMIUM',
    icon: '📜',
    description: 'Milliy sertifikat imtihonlari',
    order: 7,
    subjects: [
      { nameUz: 'Matematika', nameRu: 'Математика', nameEn: 'Mathematics', icon: '📐' },
      { nameUz: 'Fizika', nameRu: 'Физика', nameEn: 'Physics', icon: '⚡' },
      { nameUz: 'Kimyo', nameRu: 'Химия', nameEn: 'Chemistry', icon: '🧪' },
      { nameUz: 'Biologiya', nameRu: 'Биология', nameEn: 'Biology', icon: '🧬' },
      { nameUz: 'Ingliz tili', nameRu: 'Английский язык', nameEn: 'English', icon: '🇬🇧' },
      { nameUz: 'Tarix', nameRu: 'История', nameEn: 'History', icon: '🏛️' },
      { nameUz: 'Geografiya', nameRu: 'География', nameEn: 'Geography', icon: '🌍' },
      { nameUz: 'Informatika', nameRu: 'Информатика', nameEn: 'Computer Science', icon: '💻' },
      { nameUz: 'Ona tili va adabiyot', nameRu: 'Родной язык и литература', nameEn: 'Native Language & Literature', icon: '📖' },
      { nameUz: 'Huquqshunoslik', nameRu: 'Правоведение', nameEn: 'Law', icon: '⚖️' },
      { nameUz: 'Iqtisodiyot', nameRu: 'Экономика', nameEn: 'Economics', icon: '📊' },
      { nameUz: 'Pedagogika', nameRu: 'Педагогика', nameEn: 'Pedagogy', icon: '👨‍🏫' },
      { nameUz: 'Psixologiya', nameRu: 'Психология', nameEn: 'Psychology', icon: '🧠' },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding fanlar va kategoriyalar...\n');

  for (const cat of categories) {
    // Upsert category
    const category = await prisma.testCategory.upsert({
      where: {
        id: `cat_${cat.type.toLowerCase()}`,
      },
      update: {
        nameUz: cat.nameUz,
        nameRu: cat.nameRu,
        nameEn: cat.nameEn,
        icon: cat.icon,
        description: cat.description,
        order: cat.order,
      },
      create: {
        id: `cat_${cat.type.toLowerCase()}`,
        nameUz: cat.nameUz,
        nameRu: cat.nameRu,
        nameEn: cat.nameEn,
        type: cat.type as any,
        requiredPlan: cat.requiredPlan as any,
        icon: cat.icon,
        description: cat.description,
        order: cat.order,
      },
    });

    console.log(`✅ Kategoriya: ${cat.icon} ${cat.nameUz} (${cat.subjects.length} ta fan)`);

    // Upsert subjects
    for (let i = 0; i < cat.subjects.length; i++) {
      const sub = cat.subjects[i];
      const subjectId = `sub_${cat.type.toLowerCase()}_${sub.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')}`;

      await prisma.subject.upsert({
        where: { id: subjectId },
        update: {
          nameUz: sub.nameUz,
          nameRu: sub.nameRu,
          nameEn: sub.nameEn,
          icon: sub.icon,
          order: i + 1,
        },
        create: {
          id: subjectId,
          nameUz: sub.nameUz,
          nameRu: sub.nameRu,
          nameEn: sub.nameEn,
          icon: sub.icon,
          categoryId: category.id,
          order: i + 1,
        },
      });
    }
  }

  console.log('\n🎉 Seed muvaffaqiyatli tugadi!');
  console.log(`📊 Jami: ${categories.length} kategoriya, ${categories.reduce((sum, c) => sum + c.subjects.length, 0)} ta fan`);
}

main()
  .catch((e) => {
    console.error('❌ Seed xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
