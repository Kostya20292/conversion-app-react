const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export const formatDateTime = (iso: string): string => dateTimeFormatter.format(new Date(iso));
