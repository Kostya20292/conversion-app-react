export const triggerBrowserDownload = (url: string): void => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', '');
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};
