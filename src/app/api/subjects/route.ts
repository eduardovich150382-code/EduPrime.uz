import { NextRequest, NextResponse } from 'next/server';
import { TestType } from '@prisma/client';
import { logger } from '@/lib/logger';
import { getSubjects } from '@/lib/public-catalog';

const VALID_TEST_TYPES: string[] = [
  'DTM',
  'SCHOOL',
  'ATTESTATION',
  'SAT',
  'GRE',
  'CERTIFICATE',
  'PRESIDENT_SCHOOL',
];

// GET /api/subjects — barcha fanlar (kategoriya bilan)
// Optional query param: ?type=DTM — filter subjects by category type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    // Validate type parameter against allowed enum values
    if (typeParam && !VALID_TEST_TYPES.includes(typeParam)) {
      return NextResponse.json(
        { error: `Invalid type parameter. Valid values: ${VALID_TEST_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const type = typeParam as TestType | null;

    const subjects = await getSubjects(type);

    return NextResponse.json({ subjects });
  } catch (error) {
    logger.error('GET /api/subjects error:', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
