// Telegram HTML rejimi uchun yagona escape. Alohida faylda — bot menyusi va
// checkout modullari db/env'ni import qiladi, bu yerdan esa testlar va
// istalgan modul ortiqcha bog'liqliksiz foydalana oladi. Telegram faqat
// `&`, `<`, `>` ni talab qiladi; ularni qoldirsak xabar butunlay rad etiladi.
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
