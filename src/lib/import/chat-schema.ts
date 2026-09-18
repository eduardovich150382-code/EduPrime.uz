/**
 * Chatdan so'raladigan JSON ning sxemasi — YAGONA manba.
 *
 * `chat-prompt.ts` (ZIP oqimi) va `AiImportPanel` ning JSON qo'yish rejimi
 * shuni o'qiydi. Alohida leaf fayl bo'lishining sababi `image-token.ts`
 * dagidek: `chat-prompt.ts` zanjiri `@google/generative-ai` ni tortadi va
 * klientdan import qilib bo'lmaydi.
 */
export const CHAT_JSON_SCHEMA = `[
  {
    "order": 12,
    "text": "savol matni",
    "options": ["birinchi variant", "ikkinchi variant", "uchinchi variant"],
    "answer": "C"
  }
]`;
