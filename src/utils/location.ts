export const DEFAULT_ADDIS_ABABA_CITY = 'Addis Ababa';

/**
 * Normalizes Addis Ababa city variants (including any bracketed,
 * parenthetical, sub-city, or legacy spellings) strictly to "Addis Ababa".
 */
export function formatEthiopianCity(rawCity?: string | null): string {
  const trimmed = String(rawCity || '').trim();
  if (!trimmed) return DEFAULT_ADDIS_ABABA_CITY;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (
    normalized === 'addis' ||
    /^addis\s+ababa\b/i.test(normalized) ||
    /^finf?i+n+e*a?$/i.test(normalized)
  ) {
    return DEFAULT_ADDIS_ABABA_CITY;
  }

  return trimmed;
}
