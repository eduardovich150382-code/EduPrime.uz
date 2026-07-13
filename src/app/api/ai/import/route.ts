import { NextRequest, NextResponse } from 'next/server';
import { importTestFromText, importTestFromImage, importTestFromFile } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, fileUrl, fileName, mimeType } = body;

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
