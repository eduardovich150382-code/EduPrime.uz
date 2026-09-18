import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma, type QuestionType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { findDuplicateQuestions } from '@/lib/duplicate-questions';

/**
 * Mijozdan kelayotgan savol. Hamma maydon `unknown`/ixtiyoriy: bu tashqi
 * kirish, va quyida har biri alohida normallashtiriladi (default qiymat yoki
 * null). `id` bo'lsa — mavjud savolni yangilash so'rovi.
 */
interface IncomingQuestion {
  id?: unknown;
  text?: string;
  images?: string[];
  options?: unknown;
  correctAnswer?: string;
  type?: string;
  explanation?: string | null;
  explanationImages?: string[];
  videoUrl?: string | null;
  topic?: string | null;
  bloomLevel?: string | null;
  difficulty?: unknown;
  points?: number;
}

// PUT /api/teacher/tests/[id]/questions — savollarni yangilash
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions array required' }, { status: 400 });
    }

    // Find test and verify ownership
    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Bir xil matnli savollar kelganini YOZIB QO'YAMIZ, lekin so'rovni
    // bloklamaymiz: ustoz ataylab o'xshash savol yozgan bo'lishi mumkin va
    // klientda bu haqda allaqachon ogohlantirish bor. Egalik tekshiruvidan
    // KEYIN turadi — begona testId bilan logni to'ldirib bo'lmasin.
    //
    // Nega kerak: bir ustozning 31 talik importi saqlangandan keyin 62 savolga
    // aylangan, sababi esa kod bo'yicha izohlanmadi. Keyingi safar shu yozuv
    // qaysi ekrandan (`source`) qanday ro'yxat kelganini darrov aytadi.
    const incoming = questions as Array<IncomingQuestion | null>;
    const duplicates = findDuplicateQuestions(
      incoming.map((q) => ({ text: typeof q?.text === 'string' ? q.text : '' })),
    );
    if (duplicates.length > 0) {
      logger.warn('Test savollarida takroriy matn', {
        testId: id,
        source: typeof body.source === 'string' ? body.source : 'unknown',
        total: questions.length,
        groups: duplicates.length,
        extras: duplicates.reduce((n, g) => n + g.indexes.length - 1, 0),
        // `id` li nusxalar soni — update/create nisbatini ko'rsatadi
        withId: incoming.filter((q) => typeof q?.id === 'string').length,
        samples: duplicates.slice(0, 3).map((g) => ({ indexes: g.indexes, preview: g.key.slice(0, 80) })),
        report: true,
      });
    }

    // Update in place instead of delete+recreate: recreating every question on
    // every save assigns brand-new IDs, which orphans past TestResult.answers
    // (they reference the old questionId) and makes "correct answer" display
    // inconsistent for anyone who already took the test. Existing questions
    // keep their id; only questions the teacher actually removed are deleted.
    //
    // Hammasi BITTA interaktiv tranzaksiyada va advisory qulf ostida: ilgari
    // mavjud ID larni o'qish tranzaksiyadan tashqarida edi, shuning uchun
    // ustma-ust tushgan ikki saqlash (avtosaqlash + qo'lda saqlash) ikkalasi
    // ham bo'sh ro'yxat ko'rib, ikkalasi ham hammasini qaytadan yaratardi —
    // 31 savol 62 ga aylanardi. Mijoz tarafidagi navbat yetarli emas: ikki
    // vkladka yoki ikki qurilma ochiq bo'lsa u ishlamaydi.
    const written = await db.$transaction(
      async (tx) => {
        // `pg_advisory_xact_lock` — tranzaksiya tugashi bilan avtomatik
        // bo'shaydi, shuning uchun xato yoki timeout holatida ham qulf qolib
        // ketmaydi. Qulf kaliti test bo'yicha, ya'ni boshqa testlarni saqlash
        // kutib turmaydi.
        //
        // `$executeRaw`, `$queryRaw` EMAS. `pg_advisory_xact_lock()` `void`
        // qaytaradi; `$queryRaw` esa qaytgan ustunlarni deserializatsiya
        // qilmoqchi bo'ladi va `void` turida yiqiladi ("Failed to deserialize
        // column of type 'void'") — bu prod'da butun saqlashni to'xtatgan
        // (#170). `$executeRaw` natija to'plamini umuman o'qimaydi, faqat
        // ta'sirlangan qatorlar sonini qaytaradi, shuning uchun qulf uchun
        // to'g'ri API aynan shu.
        //
        // Mock qilingan route testi bu xatoni KO'RSATMAYDI (mock har qanday
        // SQL'ni qabul qiladi) — aynan shuning uchun u prod'ga chiqib ketgan.
        // Haqiqiy bazadagi qoplama: `src/lib/__tests__/advisory-lock.integration.test.ts`,
        // CI'dagi `migration-check` job'ida ishlaydi.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`test-questions:${id}`}))`;

        // Qulfdan KEYIN o'qiladi — masalaning yuragi shu qator.
        const existingQuestions = await tx.question.findMany({
          where: { testId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingQuestions.map((q) => q.id));
        const incomingIds = questions
          .map((q: { id?: unknown }) => q.id)
          .filter((qid: unknown): qid is string => typeof qid === 'string' && existingIds.has(qid));

        await tx.question.deleteMany({
          where: { testId: id, id: { notIn: incomingIds.length ? incomingIds : ['__none__'] } },
        });

        // Ketma-ket: mijozga qaytariladigan ID larni tartib bilan yig'ish
        // kerak, chunki PUT da yangi yaratilgan savol ham ID sini bilib
        // olmasa, keyingi saqlashda yana qaytadan yaratilardi.
        const rows: { id: string; order: number }[] = [];
        for (const [index, q] of (questions as IncomingQuestion[]).entries()) {
          const data = {
            text: q.text ?? '',
            images: q.images || [],
            options: (q.options || []) as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer ?? '',
            type: (q.type || 'MULTIPLE_CHOICE') as QuestionType,
            explanation: q.explanation || null,
            explanationImages: q.explanationImages || [],
            videoUrl: q.videoUrl || null,
            topic: q.topic || null,
            bloomLevel: q.bloomLevel || null,
            difficulty: typeof q.difficulty === 'number' && Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 5 ? q.difficulty : null,
            points: q.points || 1,
            order: index,
          };
          const row = typeof q.id === 'string' && existingIds.has(q.id)
            ? await tx.question.update({ where: { id: q.id }, data, select: { id: true, order: true } })
            : await tx.question.create({ data: { testId: id, ...data }, select: { id: true, order: true } });
          rows.push(row);
        }

        // Haqiqiy qator sonidan olinadi, `questions.length` dan emas: agar
        // kelgusida hisob va qatorlar ajralib ketsa, nomuvofiqlik jimgina
        // qolib ketmasin.
        const questionCount = await tx.question.count({ where: { testId: id } });
        await tx.test.update({ where: { id }, data: { questionCount } });

        return rows;
      },
      // 60+ savol uchun standart 5s kam: har savol alohida yozuv, ustiga qulf
      // kutish vaqti qo'shiladi.
      { maxWait: 10_000, timeout: 20_000 },
    );

    // `questions` — mijoz ID larni holatida saqlab, keyingi saqlashda ularni
    // qaytarib yuborishi uchun (o'shanda delete+recreate emas, update bo'ladi).
    return NextResponse.json({ message: 'Questions updated', count: written.length, questions: written });
  } catch (error) {
    logger.error('PUT /api/teacher/tests/[id]/questions error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
