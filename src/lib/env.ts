export const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || 'nahre4010@gmail.com'
)
  .trim()
  .toLowerCase();

/**
 * Ensures external URLs loaded in HTTPS-hosted iframes or media elements
 * never downgrade to insecure http:// (avoiding Mixed Content blocks on Vercel).
 */
export function enforceHttpsUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }
  return trimmed;
}
