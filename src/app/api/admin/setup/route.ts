import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This endpoint sets up the admin user
// Call ONCE after first deploy: /api/admin/setup?secret=eduprime2026
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  
  // Simple secret protection — change this in production
  if (secret !== 'eduprime2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Set xushbaxt19939577@gmail.com as ADMIN
    const adminUser = await db.user.findUnique({
      where: { email: 'xushbaxt19939577@gmail.com' },
    });

    if (!adminUser) {
      return NextResponse.json({ 
        error: 'User not found. Please login with Google first, then call this again.',
        hint: 'Login at /login with xushbaxt19939577@gmail.com'
      }, { status: 404 });
    }

    // Update role to ADMIN
    const updated = await db.user.update({
      where: { email: 'xushbaxt19939577@gmail.com' },
      data: { role: 'ADMIN' },
    });

    return NextResponse.json({
      success: true,
      message: `${updated.name} (${updated.email}) is now ADMIN!`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      }
    });
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json({ error: 'Failed to setup admin' }, { status: 500 });
  }
}
