import { expect, type Page } from '@playwright/test';

export const VALID_PASSWORD = 'Abcdefg1';

export const uniqueEmail = (): string => `user-${crypto.randomUUID()}@example.com`;

export const registerAccount = async (
  page: Page,
  email = uniqueEmail(),
): Promise<{ email: string; password: string }> => {
  await page.goto('/register');
  await page.getByLabel('Имя').fill('Иван');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(VALID_PASSWORD);
  await page.getByLabel('Подтверждение пароля').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
  await expect(page).toHaveURL(/\/account/);

  return { email, password: VALID_PASSWORD };
};
