export const toAbsoluteUrl = (pathOrUrl: string): string =>
  new URL(pathOrUrl, window.location.origin).href;
