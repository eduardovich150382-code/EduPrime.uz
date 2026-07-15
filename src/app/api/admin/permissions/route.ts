import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/admin/permissions — list user permissions (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || '';
    const search = searchParams.get('search') || '';

    // Get categories
    const categories = await db.testCategory.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        nameUz: true,
        nameRu: true,
        nameEn: true,
        type: true,
        icon: true,
      },
    });

    // If userId is provided, get permissions for that user
    if (userId) {
      const permissions = await db.userPermission.findMany({
        where: { userId },
        include: {
          category: {
            select: { id: true, nameUz: true, type: true, icon: true },
          },
        },
      });

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, telegramUsername: true, role: true },
      });

      return NextResponse.json({ user, permissions, categories });
    }

    // Search users for permission management
    if (search) {
      const users = await db.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { telegramUsername: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          telegramUsername: true,
          role: true,
          permissions: {
            include: {
              category: { select: { id: true, nameUz: true, type: true } },
            },
          },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ users, categories });
    }

    // Default: return categories and recent permissions
    const recentPermissions = await db.userPermission.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, telegramUsername: true } },
        category: { select: { id: true, nameUz: true, type: true, icon: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ permissions: recentPermissions, categories });
  } catch (error) {
    console.error('GET /api/admin/permissions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/permissions — grant permission
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, categoryId, expiresAt } = body;

    if (!userId || !categoryId) {
      return NextResponse.json({ error: 'userId and categoryId required' }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if category exists
    const category = await db.testCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Upsert permission
    const permission = await db.userPermission.upsert({
      where: {
        userId_categoryId: { userId, categoryId },
      },
      update: {
        isActive: true,
        grantedBy: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      create: {
        userId,
        categoryId,
        grantedBy: session.user.id,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ message: 'Permission granted', permission });
  } catch (error) {
    console.error('POST /api/admin/permissions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/permissions — revoke permission
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, categoryId } = body;

    if (!userId || !categoryId) {
      return NextResponse.json({ error: 'userId and categoryId required' }, { status: 400 });
    }

    // Deactivate permission
    const permission = await db.userPermission.update({
      where: {
        userId_categoryId: { userId, categoryId },
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ message: 'Permission revoked', permission });
  } catch (error) {
    console.error('DELETE /api/admin/permissions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
