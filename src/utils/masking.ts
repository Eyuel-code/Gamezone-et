/**
 * GameZoneET Sensitive Data Masking & Secure Formatting Utilities
 * Ensures PII (phone numbers, emails, government IDs, room passwords) is never
 * exposed in full plaintext in UI tables or receipts unless explicitly revealed.
 */

export function maskPhoneNumber(phone?: string | null): string {
  const raw = (phone || '').trim();
  if (!raw) return 'Not set';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const tail = digits.slice(-4);
  if (raw.startsWith('+251') || digits.startsWith('251')) {
    return `+251 ••• ••${tail}`;
  }
  if (raw.startsWith('0')) {
    return `09•• ••• ${tail}`;
  }
  return `•••• ••${tail}`;
}

export function maskEmailAddress(email?: string | null): string {
  const raw = (email || '').trim();
  if (!raw || !raw.includes('@')) return '••••';
  const [local, domain] = raw.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, Math.min(6, local.length - 2)))}@${domain}`;
}

export function maskSecretValue(value?: string | null, keepEnd = 2): string {
  const raw = (value || '').trim();
  if (!raw) return '••••••';
  if (raw.length <= keepEnd) return '••••••';
  return `${'•'.repeat(Math.min(8, Math.max(4, raw.length - keepEnd)))}${raw.slice(-keepEnd)}`;
}

export function maskIdentityInput(
  idType: 'fayda_national_id' | 'ethiopian_fido' | 'passport',
  rawValue: string
): string {
  const clean = rawValue.trim().toUpperCase().replace(/\s+/g, '');
  const tail = clean.slice(-4) || 'XXXX';
  if (idType === 'fayda_national_id') {
    return `Fayda NID •••• •••• ${tail}`;
  }
  if (idType === 'ethiopian_fido') {
    return `ET-FIDO •••• ${tail}`;
  }
  const prefix = clean.slice(0, 2).replace(/[^A-Z0-9]/g, '') || 'PP';
  return `Passport ${prefix}••••${tail}`;
}

export function formatShortHash(hash?: string | null): string {
  if (!hash || hash.length < 12) return 'UNBOUND';
  return `${hash.slice(0, 8).toUpperCase()}...${hash.slice(-6).toUpperCase()}`;
}
