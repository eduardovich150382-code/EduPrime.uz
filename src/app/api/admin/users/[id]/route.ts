import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// PATCH /api/admin/users/[id] — foydalanuvchi rolini o'zgartirish (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { newRole } = body;

    if (!newRole || !['USER', 'TEACHER', 'ADMIN'].includes(newRole)) {
      return NextResponse.json({ error: 'Valid role required: USER, TEACHER, ADMIN' }, { status: 400 });
    }

    // Don't allow changing own role
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot change own role' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role
    const updated = await db.user.update({
      where: { id },
      data: { role: newRole },
    });

    // If becoming TEACHER, create Teacher record if not exists
    if (newRole === 'TEACHER') {
      const existingTeacher = await db.teacher.findUnique({ where: { userId: id } });
      if (!existingTeacher) {
        // Get first subject as default
        const firstSubject = await db.subject.findFirst();
        if (firstSubject) {
          await db.teacher.create({
            data: {
              userId: id,
              subjectId: firstSubject.id,
              verified: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      message: `${updated.name} is now ${newRole}`,
      user: { id: updated.id, name: updated.name, role: updated.role },
    });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
