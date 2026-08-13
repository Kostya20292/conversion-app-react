const API_KEY_PREFIX = 'cv_live_';
const MASK = '••••••••••••';

export const maskApiKey = (key: string): string => {
  if (key.startsWith(API_KEY_PREFIX)) {
    return `${API_KEY_PREFIX}${MASK}`;
  }

  return MASK;
};
