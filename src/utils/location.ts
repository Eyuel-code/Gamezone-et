export const DEFAULT_ADDIS_ABABA_CITY = 'Addis Ababa (Finfinnee)';

/**
 * Normalizes Addis Ababa city variants and typos (e.g. "Addis Ababa",
 * "Addis Ababa (finifina)", "Addis Ababa (Finifine)", "finfine") to the
 * canonical localized label "Addis Ababa (Finfinnee)".
 */
export function formatEthiopianCity(rawCity?: string | null): string {
  const trimmed = String(rawCity || '').trim();
  if (!trimmed) return DEFAULT_ADDIS_ABABA_CITY;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  if (
    normalized === 'addis ababa' ||
    normalized === 'addis ababa, ethiopia' ||
    normalized === 'addis' ||
    normalized === 'finfinnee' ||
    normalized === 'finfinne' ||
    normalized === 'finfine' ||
    normalized === 'finifina' ||
    normalized === 'finifine' ||
    /^addis\s+ababa\s*[\(\/\-,]\s*fin[a-z]*\s*\)?$/i.test(normalized)
  ) {
    return DEFAULT_ADDIS_ABABA_CITY;
  }

  return trimmed;
}
