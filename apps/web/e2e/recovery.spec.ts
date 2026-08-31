import { expect, test } from '@playwright/test';
import { registerAccount } from './helpers/auth';

const NEXT_PASSWORD = 'Newpass99';

test.describe('Восстановление пароля через Telegram', () => {
  test('привязанный Telegram даёт код сброса, новый пароль открывает вход', async ({ page }) => {
    const { email } = await registerAccount(page);

    await page.getByRole('button', { name: 'Привязать Telegram' }).click();
    await expect(page.getByText('Статус: Привязан')).toBeVisible();

    const meResponse = await page.request.get('/api/auth/me');
    const meBody = (await meResponse.json()) as { telegram_id: string | null };
    expect(meBody.telegram_id).toBeTruthy();

    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();

    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Запросить код' }).click();
    await expect(page.getByRole('button', { name: 'Запросить код' })).toBeEnabled();

    const inboxResponse = await page.request.get(`/api/telegram/mock/inbox/${meBody.telegram_id}`);
    expect(inboxResponse.status()).toBe(200);
    const inboxBody = (await inboxResponse.json()) as { code: string };
    expect(inboxBody.code.length).toBeGreaterThan(0);

    await page.goto('/reset-password');
    await page.getByLabel('Код').fill(inboxBody.code);
    await page.getByLabel('Новый пароль', { exact: true }).fill(NEXT_PASSWORD);
    await page.getByLabel('Подтверждение пароля').fill(NEXT_PASSWORD);
    await page.getByRole('button', { name: 'Сохранить пароль' }).click();

    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill(NEXT_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/account/);
  });
});
