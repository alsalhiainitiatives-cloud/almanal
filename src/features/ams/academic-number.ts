/**
 * Academic number (= the student's single official identifier).
 *
 * Format: `MN-{stage}-{YY}-{NNN}`
 *   MN  = Al Manal Kindergarten & Schools
 *   1   = صغار المنال · 2 = روضة المنال · 3 = ابتدائية المنال
 *   27  = the later Gregorian year of the academic year (2026-2027 → 27)
 *   001 = sequential student number inside that stage + year
 *
 * Client-safe: no server imports.
 */
export const ACADEMIC_NUMBER_PREFIX = "MN";
export const ACADEMIC_NUMBER_PATTERN = /^MN-[1-9]-\d{2}-\d{3,}$/;
export const ACADEMIC_NUMBER_EXAMPLE = "MN-1-27-001";

const STAGE_CODES: Record<string, number> = {
  "small-kids": 1,
  montessori: 2,
  primary: 3,
};

/** Stage code from the stage slug, falling back to its sort order. */
export function stageCode(slug?: string | null, sortOrder?: number | null): number {
  const bySlug = slug ? STAGE_CODES[slug] : undefined;
  if (bySlug) return bySlug;
  if (sortOrder && sortOrder > 0 && sortOrder < 10) return sortOrder;
  return 1;
}

/** "2026-2027 / 1448هـ" → "27" (the later Gregorian year). */
export function academicYearCode(academicYear?: string | null): string {
  const years = String(academicYear ?? "").match(/\d{4}/g) ?? [];
  const gregorian = years.map(Number).filter((y) => y >= 1900 && y <= 2200);
  if (gregorian.length) return String(Math.max(...gregorian)).slice(2);
  return String(new Date().getFullYear() + 1).slice(2);
}

export function academicNumberPrefix(academicYear?: string | null, code = 1): string {
  return `${ACADEMIC_NUMBER_PREFIX}-${code}-${academicYearCode(academicYear)}`;
}

export function isValidAcademicNumber(value?: string | null): boolean {
  return ACADEMIC_NUMBER_PATTERN.test(String(value ?? "").trim().toUpperCase());
}

/** Display helper — hides legacy/ugly values that predate this scheme. */
export function formatAcademicNumber(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  return isValidAcademicNumber(raw) ? raw.toUpperCase() : "—";
}
