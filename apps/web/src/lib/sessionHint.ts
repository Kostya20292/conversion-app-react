const SESSION_HINT_KEY = 'convertly.hasSession';

export const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
};

export const setSessionHint = (): void => {
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1');
  } catch {
    return;
  }
};

export const clearSessionHint = (): void => {
  try {
    localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    return;
  }
};
