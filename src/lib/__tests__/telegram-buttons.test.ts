import { describe, expect, it } from 'vitest';
import { btn } from '../telegram-buttons';

describe('btn', () => {
  it('faqat style qo‘shadi — url/web_app/callback_data o‘zgarmaydi', () => {
    expect(btn.success('A', { url: 'https://x' })).toEqual({ text: 'A', url: 'https://x', style: 'success' });
    expect(btn.primary('B', { web_app: { url: 'https://y' } })).toEqual({ text: 'B', web_app: { url: 'https://y' }, style: 'primary' });
    expect(btn.danger('C', { callback_data: 'reject_1' })).toEqual({ text: 'C', callback_data: 'reject_1', style: 'danger' });
  });
});
