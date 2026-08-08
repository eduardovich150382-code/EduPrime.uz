import { NextRequest, NextResponse } from 'next/server';
import { importTestFromText, importTestFromImage, importTestFromFile } from '@/lib/gemini';
import { requireTeacher, applyRateLimit } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Requires TEACHER/ADMIN — this calls a paid/rate-limited AI API and must
    // not be reachable by anonymous visitors.
    const { user, error } = await requireTeacher();
    if (error) return error;

    const rateLimited = applyRateLimit(user.id, 20, 60000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { type, content, fileUrl, fileName, mimeType } = body;

    // fileUrl is fetched server-side by importTestFromFile — restrict to
    // http(s) URLs only to prevent SSRF against internal/cloud-metadata hosts.
    if (type === 'file' && fileUrl) {
      try {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return NextResponse.json({ error: 'Invalid fileUrl protocol' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid fileUrl' }, { status: 400 });
      }
    }

    let result;

    switch (type) {
      case 'text':
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }
        result = await importTestFromText(content);
        break;

      case 'image':
        if (!content || !mimeType) {
          return NextResponse.json({ error: 'Image content and mimeType are required' }, { status: 400 });
        }
        result = await importTestFromImage(content, mimeType);
        break;

      case 'file':
        if (!fileUrl || !fileName) {
          return NextResponse.json({ error: 'FileUrl and fileName are required' }, { status: 400 });
        }
        result = await importTestFromFile(fileUrl, fileName);
        break;

      default:
        return NextResponse.json({ error: 'Invalid type. Use: text, image, file' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Import API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
