import { describe, expect, it } from 'vitest';
import { parseBindStartParam, toBindStartParam } from '@/telegram/bind-start-param';

const BIND_TOKEN = 'a'.repeat(48);

describe('parseBindStartParam (ТЗ §6.3 deep-link bind_<token>)', () => {
  it('собирает start_param вида bind_<token> и разбирает его обратно', () => {
    const startParam = toBindStartParam(BIND_TOKEN);

    expect(startParam).toBe(`bind_${BIND_TOKEN}`);
    expect(parseBindStartParam(startParam)).toBe(BIND_TOKEN);
  });

  it('отклоняет payload без префикса, с коротким token или с лишними символами', () => {
    expect(parseBindStartParam(BIND_TOKEN)).toBeNull();
    expect(parseBindStartParam(`bind_${'a'.repeat(47)}`)).toBeNull();
    expect(parseBindStartParam(`bind_${BIND_TOKEN}x`)).toBeNull();
    expect(parseBindStartParam('')).toBeNull();
  });
});
