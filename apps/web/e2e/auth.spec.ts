import { expect, test } from '@playwright/test';

test.describe('Авторизация', () => {
  test('гость с главной открывает регистрацию и видит правило пароля', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Получить ключ' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();
    await expect(page.getByText('Не меньше 8 символов, буква и цифра')).toBeVisible();
  });

  test('со страницы входа можно перейти к восстановлению пароля', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Забыли пароль?' }).click();

    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Восстановление пароля' })).toBeVisible();
  });

  test('регистрация открывает ЛК, где виден API-ключ', async ({ page }) => {
    const email = `user-${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByLabel('Имя').fill('Иван');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Пароль').fill('Abcdefg1');
    await page.getByLabel('Подтверждение пароля').fill('Abcdefg1');
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(/cv_live_/)).toBeVisible();
  });

  test('неверный пароль показывает общее сообщение без уточнения поля', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Пароль').fill('Wrongpass1');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page.getByText('Неверный email или пароль')).toBeVisible();
  });
});
