import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import {
  applyRelaxationStep,
  buildItemWhere,
  getRecentlyCorrectItemIds,
  makeSeedSequence,
  nextRelaxationStep,
  parseItemSpec,
  pickItems,
  type ItemSpec,
  type PickableItem,
  type RelaxationStep,
} from '@/lib/item-picker';

const MAX_LIMIT = 200;

async function fetchCandidates(spec: ItemSpec, excludeItemIds: string[]): Promise<PickableItem[]> {
  return db.item.findMany({
    where: buildItemWhere(spec, excludeItemIds),
    select: { id: true, templateId: true, difficulty: true },
  });
}

// POST /api/items/search — filtrga mos item id'larni tanlab qaytaradi.
// Havza `limit`dan kam chiqsa, cheklovlar item-picker.ts dagi
// nextRelaxationStep tartibida (qiyinlik → sinf → qo'shni mavzular)
// birma-bir bo'shatiladi va nima bo'shatilgani `relaxed`da qaytariladi.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const parsed = parseItemSpec(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { spec } = parsed;

    const b = (body ?? {}) as Record<string, unknown>;
    const limit = b.limit;
    if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0 || limit > MAX_LIMIT) {
      return NextResponse.json({ error: `limit — 1 dan ${MAX_LIMIT} gacha butun son bo'lishi kerak` }, { status: 400 });
    }
    const seedParam = b.seed;
    if (seedParam !== undefined && typeof seedParam !== 'number') {
      return NextResponse.json({ error: "seed — son bo'lishi kerak" }, { status: 400 });
    }

    const excludeItemIds = spec.excludeAnsweredCorrectlyDays
      ? await getRecentlyCorrectItemIds(user.id, spec.excludeAnsweredCorrectlyDays)
      : [];

    const relaxed: RelaxationStep[] = [];
    let effectiveSpec = spec;
    let candidates = await fetchCandidates(effectiveSpec, excludeItemIds);

    while (candidates.length < limit) {
      const step = nextRelaxationStep(effectiveSpec, relaxed);
      if (!step) break;
      relaxed.push(step);

      const relaxedSpec = applyRelaxationStep(effectiveSpec, step);
      if (JSON.stringify(relaxedSpec) === JSON.stringify(effectiveSpec)) continue; // bo'shatish hech narsani o'zgartirmadi — keyingi qadamga o'tiladi

      effectiveSpec = relaxedSpec;
      candidates = await fetchCandidates(effectiveSpec, excludeItemIds);
    }

    const seed = typeof seedParam === 'number' ? seedParam : Math.floor(Math.random() * 2 ** 31);
    const picked = pickItems(candidates, {
      limit,
      range: { min: effectiveSpec.difficultyMin ?? 1, max: effectiveSpec.difficultyMax ?? 5 },
      seedFn: makeSeedSequence(seed),
    });

    return NextResponse.json({ ids: picked.map((p) => p.id), relaxed });
  } catch (err) {
    console.error('POST /api/items/search error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
