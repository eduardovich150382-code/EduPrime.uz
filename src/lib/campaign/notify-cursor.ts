import { z } from 'zod';

// Yakuniy xabarlar kursori — SystemSetting `campaign_notify:<id>` qiymati (JSON).
// Ishtirokchilar `id` bo'yicha tartiblanadi; `lastParticipantId` dan keyingilar hali yuborilmagan.

const cursorSchema = z.object({
  lastParticipantId: z.string().nullable(),
  sent: z.number().int().min(0),
  failed: z.number().int().min(0),
  done: z.boolean(),
});

export type NotifyCursor = z.infer<typeof cursorSchema>;

export const INITIAL_NOTIFY_CURSOR: NotifyCursor = { lastParticipantId: null, sent: 0, failed: 0, done: false };

/** Buzilgan qiymat — boshidan (`null`): chaqiruvchi CAS uchun xom satrni o'zi saqlaydi. */
export function parseNotifyCursor(raw: string): NotifyCursor | null {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
