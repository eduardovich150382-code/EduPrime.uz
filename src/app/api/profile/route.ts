import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

const ALLOWED_IMAGE_PREFIXES = [
  'https://utfs.io/',
  'https://lh3.googleusercontent.com/',
  'https://res.cloudinary.com/',
];

function isValidImageUrl(url: string): boolean {
  return ALLOWED_IMAGE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// GET /api/profile — get current user profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        telegramId: true,
        telegramUsername: true,
        googleId: true,
        role: true,
        lang: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/profile — update user profile (name, image)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body;

    const updateData: { name?: string; image?: string } = {};
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof image === 'string' && image.trim().length > 0) {
      const trimmedImage = image.trim();
      if (!isValidImageUrl(trimmedImage)) {
        return NextResponse.json(
          { error: 'Invalid image URL. Only UploadThing, Google, and Cloudinary URLs are allowed.' },
          { status: 400 }
        );
      }
      updateData.image = trimmedImage;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        telegramId: true,
        telegramUsername: true,
        googleId: true,
        role: true,
        lang: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('PATCH /api/profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
