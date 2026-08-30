export const triggerBrowserDownload = (url: string, filename?: string): void => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename ?? '');
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};
