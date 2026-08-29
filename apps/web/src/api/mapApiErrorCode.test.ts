import { describe, expect, it } from 'vitest';
import { mapApiErrorCode, mapNetworkError } from './mapApiErrorCode';

describe('mapApiErrorCode', () => {
  it('не показывает английский error.message как основной текст', () => {
    expect(
      mapApiErrorCode({
        code: 'conversion_failed',
        message: 'Conversion failed',
      }),
    ).toBe('Не удалось конвертировать. Файл может быть повреждён');
  });

  it('для неверного MIME показывает сообщение о типе файла', () => {
    expect(mapApiErrorCode({ code: 'invalid_file_type' })).toBe(
      'Файл повреждён или имеет неверный тип',
    );
  });

  it('для слишком большого файла показывает лимит 10 МБ', () => {
    expect(mapApiErrorCode({ code: 'file_too_large' })).toBe('Максимальный размер — 10 МБ');
  });

  it('для ошибки движка предлагает повторить с другим файлом', () => {
    expect(mapApiErrorCode({ code: 'conversion_failed' })).toBe(
      'Не удалось конвертировать. Файл может быть повреждён',
    );
  });

  it('для таймаута конвертации показывает превышение времени', () => {
    expect(mapApiErrorCode({ code: 'conversion_timeout' })).toBe('Превышено время конвертации');
  });

  it('для 5xx показывает, что сервис временно недоступен', () => {
    expect(mapApiErrorCode({ code: 'internal_error' })).toBe('Сервис временно недоступен');
  });

  it('для лимита запросов показывает паузу в секундах', () => {
    expect(mapApiErrorCode({ code: 'rate_limited', retryAfterSeconds: 30 })).toBe(
      'Слишком много запросов. Подождите 30 сек',
    );
  });

  it('для просроченного скачивания показывает, что файл недоступен', () => {
    expect(mapApiErrorCode({ code: 'gone', context: 'download' })).toBe(
      'Файл больше недоступен (истёк срок хранения)',
    );
  });

  it('для истекшей или отозванной share-ссылки скрывает детали владельца', () => {
    expect(mapApiErrorCode({ code: 'gone', context: 'share' })).toBe('Ссылка больше недоступна');
  });

  it('для неверного пароля или email показывает общее сообщение без уточнения поля', () => {
    expect(mapApiErrorCode({ code: 'unauthorized', context: 'login' })).toBe(
      'Неверный email или пароль',
    );
  });

  it('для истекшей сессии показывает, что нужно войти снова', () => {
    expect(mapApiErrorCode({ code: 'unauthorized', context: 'session' })).toBe('Сессия истекла');
  });

  it('для занятого email при регистрации показывает русское сообщение', () => {
    expect(mapApiErrorCode({ code: 'invalid_request', context: 'register' })).toBe(
      'Этот email уже зарегистрирован',
    );
  });
});

describe('mapNetworkError', () => {
  it('при обрыве соединения предлагает проверить сеть и повторить', () => {
    expect(mapNetworkError()).toBe('Не удалось загрузить. Проверьте соединение');
  });
});
