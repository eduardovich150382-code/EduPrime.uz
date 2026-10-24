import { db } from './db';
import type { SubscriptionEntitlement, UserEntitlements } from './entitlements';

export interface LocalizedName { nameUz: string; nameRu: string; nameEn: string }
export interface SubscriptionDetails extends SubscriptionEntitlement {
  id: string;
  product: LocalizedName | null;
  subjects: LocalizedName[];
}
export interface DetailedEntitlements extends UserEntitlements { subscriptions: SubscriptionDetails[] }

// Prisma relation include bir nechta SQL yuboradi. Pricing uchun nomlarni
// ham bitta SELECT'da olamiz; bu yo'l ruxsatlarni qaytadan yuklamaydi.
export async function loadSubscriptionDetails(userId: string, now: Date): Promise<DetailedEntitlements> {
  const subscriptions = await db.$queryRaw<SubscriptionDetails[]>`
    SELECT s."id", s."plan", s."categoryId", s."subjectIds", s."isActive", s."endDate",
      p."subjectRule",
      CASE WHEN p."id" IS NULL THEN NULL ELSE json_build_object(
        'nameUz', p."nameUz", 'nameRu', p."nameRu", 'nameEn', p."nameEn") END AS product,
      COALESCE((SELECT json_agg(json_build_object(
        'nameUz', subject."nameUz", 'nameRu', subject."nameRu", 'nameEn', subject."nameEn")
        ORDER BY subject."order", subject."id") FROM "Subject" subject
        WHERE subject."id" = ANY(s."subjectIds")), '[]'::json) AS subjects
    FROM "Subscription" s LEFT JOIN "Product" p ON p."id" = s."productId"
    WHERE s."userId" = ${userId} AND s."isActive" = true
      AND s."startDate" <= ${now} AND s."endDate" >= ${now}
    ORDER BY s."endDate", s."id"
  `;
  return { now, permissions: [], subscriptions };
}
