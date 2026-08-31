export const telegramBindUrl = (botUsername: string, startParam: string): string => {
  const username = botUsername.replace(/^@/, '');
  return `https://t.me/${username}?start=${encodeURIComponent(startParam)}`;
};
