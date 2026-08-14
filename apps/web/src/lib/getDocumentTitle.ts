import { isUnavailableSharePreview } from '@/constants/share';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Convertly — конвертация файлов онлайн',
  '/login': 'Вход — Convertly',
  '/register': 'Регистрация — Convertly',
  '/forgot-password': 'Восстановление пароля — Convertly',
  '/reset-password': 'Новый пароль — Convertly',
  '/account': 'Личный кабинет — Convertly',
  '/api-docs': 'API — Convertly',
};

export const getDocumentTitle = (pathname: string): string => {
  const exactTitle = PAGE_TITLES[pathname];
  if (exactTitle) {
    return exactTitle;
  }

  if (pathname.startsWith('/s/')) {
    const token = pathname.slice('/s/'.length);
    return isUnavailableSharePreview(token)
      ? 'Ссылка недоступна — Convertly'
      : 'Общий файл — Convertly';
  }

  return 'Страница не найдена — Convertly';
};
