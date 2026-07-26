/**
 * Admission domain rules (client-safe): identity parsing, age maths and the
 * eligibility engine that maps a child's age to stages and classrooms.
 */

export type Nationality = "saudi" | "resident";

export type StageLike = {
  id: string;
  slug: string;
  name_ar: string;
  min_age_months: number;
  max_age_months: number;
  total_seats: number;
  taken_seats: number;
};

export type ClassroomLike = {
  id: string;
  stage_id: string;
  name_ar: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
  taken_seats: number;
};

/** Saudi IDs start with 1, resident Iqamas start with 2. */
export function detectNationality(nationalId: string): Nationality | null {
  const digits = nationalId.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("1")) return "saudi";
  if (digits.startsWith("2")) return "resident";
  return null;
}

export function nationalIdError(nationalId: string): string | null {
  const digits = nationalId.replace(/\D/g, "");
  if (digits.length === 0) return "أدخل رقم الهوية أو الإقامة";
  if (digits.length !== 10) return "رقم الهوية يجب أن يكون 10 أرقام";
  if (!detectNationality(digits)) return "رقم الهوية يجب أن يبدأ بالرقم 1 (سعودي) أو 2 (مقيم)";
  return null;
}

export const NATIONALITY_LABELS: Record<Nationality, string> = {
  saudi: "سعودي",
  resident: "مقيم",
};

export function ageInMonths(birthDate: string | null | undefined, at: Date = new Date()): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  let months = (at.getFullYear() - dob.getFullYear()) * 12 + (at.getMonth() - dob.getMonth());
  if (at.getDate() < dob.getDate()) months -= 1;
  return months;
}

export function formatAge(months: number | null): string {
  if (months === null || months < 0) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} شهرًا`;
  if (m === 0) return `${y} ${y === 1 ? "سنة" : y === 2 ? "سنتان" : "سنوات"}`;
  return `${y} ${y === 1 ? "سنة" : y === 2 ? "سنتان" : "سنوات"} و ${m} شهرًا`;
}

export function seatsLeft(entity: { total_seats?: number; taken_seats: number; capacity?: number }): number {
  const total = entity.total_seats ?? entity.capacity ?? 0;
  return Math.max(0, total - entity.taken_seats);
}

export function isStageEligible(stage: StageLike, months: number | null): boolean {
  if (months === null) return false;
  return months >= stage.min_age_months && months <= stage.max_age_months;
}

export function eligibleStages(stages: StageLike[], months: number | null): StageLike[] {
  return stages.filter((s) => isStageEligible(s, months));
}

export function eligibleClassrooms(
  classrooms: ClassroomLike[],
  stageId: string | null,
  months: number | null,
): ClassroomLike[] {
  return classrooms.filter(
    (c) =>
      (!stageId || c.stage_id === stageId) &&
      months !== null &&
      months >= c.min_age_months &&
      months <= c.max_age_months &&
      seatsLeft(c) > 0,
  );
}

/** Qurra support: Saudi parent + child under 6 years. */
export function isQurraEligible(nationality: Nationality | null, childAgeMonths: number | null): boolean {
  return nationality === "saudi" && childAgeMonths !== null && childAgeMonths < 72;
}

export const QURRA_STATUS_LABELS: Record<string, string> = {
  not_requested: "لم يُطلب",
  eligible: "مستوفٍ للشروط",
  waiting_school_review: "بانتظار مراجعة المدرسة",
  submitted_to_qurra: "تم الرفع لمنصة قرة",
  waiting_response: "بانتظار رد قرة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  submitted: "تم الإرسال",
  under_review: "قيد المراجعة",
  needs_action: "بحاجة إلى إجراء",
  approved: "مقبول",
  rejected: "مرفوض",
  withdrawn: "مسحوب",
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-beige text-foreground",
  submitted: "bg-sky/70 text-foreground",
  under_review: "bg-gold text-gold-foreground",
  needs_action: "bg-destructive/15 text-destructive",
  approved: "bg-mint text-foreground",
  rejected: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};