import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UTApi } from 'uploadthing/server';

const utapi = new UTApi();

// POST /api/upload — rasm yuklash (teacher panel uchun)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const endpoint = request.nextUrl.searchParams.get('endpoint');

    if (!file) {
      return NextResponse.json({ error: 'File required' }, { status: 400 });
    }

    if (endpoint === 'aiImportFile') {
      // AI Import (savollarni fayldan ajratish) — PDF, matn va Word fayllar
      const ALLOWED_TYPES = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Faqat PDF, DOCX yoki TXT fayllar qo\'llab-quvvatlanadi' }, { status: 400 });
      }
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'Fayl hajmi 8 MB dan oshmasligi kerak' }, { status: 400 });
      }
    } else {
      // Validate type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
      }

      // Validate size (max 4MB)
      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 400 });
      }
    }

    // Upload via UploadThing
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    return NextResponse.json({ url: response.data.url });
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
