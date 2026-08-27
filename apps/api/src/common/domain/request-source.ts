export const REQUEST_SOURCES = ['ui', 'api'] as const;

export type RequestSource = (typeof REQUEST_SOURCES)[number];
