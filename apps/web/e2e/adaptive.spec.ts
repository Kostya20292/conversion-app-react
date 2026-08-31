import { expect, test, type Locator } from '@playwright/test';
import { convertJpegToPng } from './helpers/convert';

const MIN_HIT_AREA_PX = 44;

const expectMinHitArea = async (locator: Locator): Promise<void> => {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_HIT_AREA_PX);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_HIT_AREA_PX);
};

test.describe('Адаптив', () => {
  test.describe.configure({ timeout: 90_000 });

  test('на главной видны навигация, dropzone и CTA с hit-area ≥44px', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Конвертация' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Зона загрузки файла' })).toBeVisible();

    await expectMinHitArea(page.getByRole('button', { name: 'Выбрать файл' }));
    await expectMinHitArea(page.getByRole('button', { name: 'Конвертировать' }));
  });

  test('гость конвертирует JPG → PNG в мобильном viewport', async ({ page }) => {
    await convertJpegToPng(page);
    await expect(page.getByRole('button', { name: /Скачать/ })).toBeVisible();
  });
});
