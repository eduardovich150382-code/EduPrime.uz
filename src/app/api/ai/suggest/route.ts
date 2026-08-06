import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, applyRateLimit } from '@/lib/api-auth';
import { suggestQuestionMetadata } from '@/lib/gemini';

// POST /api/ai/suggest — savol matni/to'g'ri javobga asoslanib AI orqali
// distraktor va mavzu/Bloom darajasi taklifi (Gemini)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher();
    if (error) return error;

    const rateLimited = applyRateLimit(user.id, 20, 60000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { text, correctAnswer, type, existingOptionTexts } = body;

    if (!text || !correctAnswer) {
      return NextResponse.json({ error: 'text va correctAnswer talab qilinadi' }, { status: 400 });
    }

    const result = await suggestQuestionMetadata({
      text: String(text).slice(0, 2000),
      correctAnswer: String(correctAnswer).slice(0, 500),
      type: typeof type === 'string' ? type : 'MULTIPLE_CHOICE',
      existingOptionTexts: Array.isArray(existingOptionTexts)
        ? existingOptionTexts.filter((t: unknown) => typeof t === 'string').slice(0, 5)
        : [],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/ai/suggest error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
