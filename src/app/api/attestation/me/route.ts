import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { loadAttestationPage, type AttestationPersonalData } from '@/lib/attestation-page';
import { loadPricingPage } from '@/lib/pricing-page';
import { buildAttestationView } from '@/lib/attestation-offer';
import { loginHref, localizedPath } from '@/lib/safe-return-path';
import { requestLocale } from '@/lib/request-locale';

// /attestation statik (ISR) — natija, readiness, ruxsat va obuna shu yerdan,
// klientda. Javob foydalanuvchiniki: hech qanday kesh (CDN, brauzer) saqlamasin.
export const dynamic = 'force-dynamic';
const PRIVATE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) {
    error.headers.set('Cache-Control', PRIVATE['Cache-Control']);
    return error;
  }
  try {
    const locale = requestLocale(request);
    // PAYWALL: loadAttestationPage savol matni/variant/javobni qaytarmaydi
    // (lib/attestation-page.ts dagi chegara) — bu yerda faqat tayyor qatorlar.
    const [page, pricing] = await Promise.all([
      loadAttestationPage({ id: user.id, role: user.role }, locale),
      loadPricingPage(user.id, locale),
    ]);
    // `userId` — klient ishora bilan sessiyadan oldin so'rasa, javob kimniki
    // ekanini sessiya bilan solishtiradi (lib/personal-data.ts).
    const body: AttestationPersonalData & { userId: string } = {
      userId: user.id,
      mockRows: page.mockRows,
      topicRows: page.topicRows,
      hero: page.hero,
      readiness: page.readiness,
      view: buildAttestationView(pricing, { userId: user.id, loginHref: loginHref(localizedPath('/attestation', locale)) }, new Date()),
    };
    return NextResponse.json(body, { headers: PRIVATE });
  } catch (err) {
    logger.error('GET /api/attestation/me error:', { error: err });
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: PRIVATE });
  }
}
