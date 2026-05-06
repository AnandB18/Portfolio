/** True when the href should open in a new browsing context (PDF, absolute HTTP(S), or site-relative). */
export function hrefOpensInNewTab(href: string): boolean {
  const h = href.trim();
  return (
    h.startsWith('http://') ||
    h.startsWith('https://') ||
    h.startsWith('/') ||
    h.toLowerCase().endsWith('.pdf')
  );
}
