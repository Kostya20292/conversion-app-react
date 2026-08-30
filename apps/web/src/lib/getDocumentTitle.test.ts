import { describe, expect, it } from 'vitest';
import { getDocumentTitle } from '@/lib/getDocumentTitle';

describe('getDocumentTitle', () => {
  it('задаёт title главной', () => {
    expect(getDocumentTitle('/')).toBe('Convertly — конвертация файлов онлайн');
  });

  it('задаёт title для недоступной share-ссылки', () => {
    expect(getDocumentTitle('/s/expired')).toBe('Ссылка недоступна — Convertly');
  });

  it('задаёт title страницы 404', () => {
    expect(getDocumentTitle('/unknown-page')).toBe('Страница не найдена — Convertly');
  });
});
