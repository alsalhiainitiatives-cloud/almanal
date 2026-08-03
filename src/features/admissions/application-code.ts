/**
 * Application code system: `MN-48-ABC123`
 *
 * MN  = school prefix (Al Manal)
 * 48  = Hijri intake year (1448)
 * ABC123 = 6-char unambiguous serial (no O/0/I/1) — ASCII, QR/URL/export safe.
 *
 * This module is client-safe and is the single source of truth for building,
 * normalizing, validating and displaying application codes.
 */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const APPLICATION_CODE_PREFIX = "MN";
export const APPLICATION_CODE_SERIAL_LENGTH = 6;
export const APPLICATION_CODE_PATTERN = /^MN-\d{2}-[A-HJ-NP-Z2-9]{6}$/;
export const APPLICATION_CODE_EXAMPLE = "MN-48-ABC123";

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function asciiDigits(value: string) {
  return value.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * Cleans anything a user may paste or scan into canonical form.
 * Handles Arabic digits, lowercase, spaces, and missing/extra separators.
 */
export function normalizeApplicationCode(raw: string): string {
  const cleaned = asciiDigits(String(raw ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith(APPLICATION_CODE_PREFIX)) {
    const rest = cleaned.slice(APPLICATION_CODE_PREFIX.length);
    const match = rest.match(/^(\d{2,4})([A-Z0-9]{4,8})$/);
    if (match) {
      const year = match[1].slice(-2);
      return `${APPLICATION_CODE_PREFIX}-${year}-${match[2]}`;
    }
  }
  return cleaned;
}

export function isValidApplicationCode(value: string): boolean {
  return APPLICATION_CODE_PATTERN.test(normalizeApplicationCode(value));
}

/** Arabic validation message, or null when the code is acceptable. */
export function applicationCodeError(value: string): string | null {
  const code = normalizeApplicationCode(value);
  if (!code) return "يرجى إدخال رقم الطلب";
  if (APPLICATION_CODE_PATTERN.test(code)) return null;
  // Legacy codes issued before the new scheme stay usable.
  if (code.startsWith(APPLICATION_CODE_PREFIX) && code.length >= 8) return null;
  return `رقم الطلب غير صالح. الصيغة الصحيحة مثل ${APPLICATION_CODE_EXAMPLE}`;
}

/** Random unambiguous serial using a cryptographic source. */
export function randomApplicationSerial(length = APPLICATION_CODE_SERIAL_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** "2026-2027 / 1448هـ" → "48" (falls back to the Gregorian short year). */
export function intakeYearSuffix(academicYear: string): string {
  const hijri = academicYear.match(/1(\d{3})/);
  if (hijri) return hijri[1].slice(1);
  return String(new Date().getFullYear()).slice(2);
}

export function buildApplicationCode(academicYear: string): string {
  return `${APPLICATION_CODE_PREFIX}-${intakeYearSuffix(academicYear)}-${randomApplicationSerial()}`;
}

/** Display helper: keeps codes LTR-safe inside RTL text. */
export function formatApplicationCode(value: string | null | undefined): string {
  if (!value) return "—";
  return normalizeApplicationCode(value) || value;
}