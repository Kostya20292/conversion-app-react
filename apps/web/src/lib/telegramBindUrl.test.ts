import { describe, expect, it } from 'vitest';
import { telegramBindUrl } from '@/lib/telegramBindUrl';

describe('telegramBindUrl (ТЗ §6.3 deep-link t.me/?start=bind_<token>)', () => {
  it('собирает ссылку на бота с start_param и снимает @ у username', () => {
    expect(telegramBindUrl('ConvertlyBot', 'bind_abc')).toBe(
      'https://t.me/ConvertlyBot?start=bind_abc',
    );
    expect(telegramBindUrl('@ConvertlyBot', 'bind_abc')).toBe(
      'https://t.me/ConvertlyBot?start=bind_abc',
    );
  });
});
