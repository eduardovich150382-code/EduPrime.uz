// Inline tugmalar uchun yagona yasovchi. Bot API'dagi `style` maydoni
// tugmani rangli qiladi; eski Telegram ilovalari uni e'tiborsiz qoldiradi —
// tugma oddiy ko'rinadi, xato bo'lmaydi.
//
// Rang qoidasi: har xabarda bitta asosiy harakat — success (yashil),
// qolgan navigatsiya — primary (ko'k), danger (qizil) faqat xavfli admin
// harakatlariga (rad etish, bekor qilish). Pastki chapdagi menyu tugmasi
// (setChatMenuButton) rangni qo'llab-quvvatlamaydi — u bu yerda emas.

export type ButtonStyle = 'success' | 'primary' | 'danger';

export type ButtonAction = { url: string } | { web_app: { url: string } } | { callback_data: string };

export type InlineButton = { text: string; style?: ButtonStyle } & ButtonAction;

function styled(style: ButtonStyle) {
  return (text: string, action: ButtonAction): InlineButton => ({ text, ...action, style });
}

export const btn = {
  success: styled('success'),
  primary: styled('primary'),
  danger: styled('danger'),
};
