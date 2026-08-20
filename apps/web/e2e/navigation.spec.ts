import { expect, test } from '@playwright/test';

test.describe('Навигация', () => {
  test('неизвестный адрес показывает 404 и ссылку на главную', async ({ page }) => {
    await page.goto('/no-such-page');

    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
  });
});
