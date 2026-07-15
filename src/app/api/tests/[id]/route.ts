import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/tests/[id] — bitta testni olish
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      include: {
        subject: true,
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            images: true,
            options: true,
            type: true,
            points: true,
            order: true,
            // NOT including correctAnswer — foydalanuvchi ko'rmasligi kerak
          },
        },
        teacher: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error('GET /api/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/tests/[id] — testni tahrirlash (owner/admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const test = await db.test.findUnique({
      where: { id },
      include: { teacher: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check permission
    const role = (session.user as any)?.role;
    if (role !== 'ADMIN' && test.teacher?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (body.titleUz !== undefined) updateData.titleUz = body.titleUz;
    if (body.titleRu !== undefined) updateData.titleRu = body.titleRu;
    if (body.titleEn !== undefined) updateData.titleEn = body.titleEn;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.isFree !== undefined) updateData.isFree = body.isFree;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
    if (body.isPublished !== undefined) updateData.isPublished = body.isPublished;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

    const updated = await db.test.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ test: updated });
  } catch (error) {
    console.error('PUT /api/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/tests/[id] — testni o'chirish
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const role = (session.user as any)?.role;

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

    await db.test.delete({ where: { id } });
    return NextResponse.json({ message: 'Test deleted' });
  } catch (error) {
    console.error('DELETE /api/tests/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
