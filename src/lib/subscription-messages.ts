import uz from '@/messages/uz.json';
import ru from '@/messages/ru.json';
import en from '@/messages/en.json';

export function subscriptionMessages(locale: string) {
  return (locale === 'ru' ? ru : locale === 'en' ? en : uz).subscriptionUi;
}
