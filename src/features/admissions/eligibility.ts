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

export type AgeParts = { years: number; months: number; days: number; totalMonths: number };

/**
 * Exact calendar age (years / months / days). Supports newborns: a child born
 * yesterday resolves to 0y 0m 1d and still classifies into infant stages.
 */
export function ageParts(birthDate: string | null | undefined, at: Date = new Date()): AgeParts | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  if (dob.getTime() > at.getTime()) return null;

  let years = at.getFullYear() - dob.getFullYear();
  let months = at.getMonth() - dob.getMonth();
  let days = at.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(at.getFullYear(), at.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days, totalMonths: years * 12 + months };
}

const unit = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

/** "سنتان و 4 أشهر و 12 يومًا" — professional, RTL-friendly age rendering. */
export function formatAgeDetailed(parts: AgeParts | null): string {
  if (!parts) return "—";
  const chunks: string[] = [];
  if (parts.years > 0) chunks.push(unit(parts.years, "سنة واحدة", "سنتان", "سنوات", "سنة"));
  if (parts.months > 0) chunks.push(unit(parts.months, "شهر واحد", "شهران", "أشهر", "شهرًا"));
  if (parts.days > 0 && parts.years === 0) chunks.push(unit(parts.days, "يوم واحد", "يومان", "أيام", "يومًا"));
  if (!chunks.length) return "أقل من يوم";
  return chunks.join(" و ");
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
  principal_review: "لدى مدير المدرسة",
  waitlisted: "قائمة الانتظار",
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-beige text-foreground",
  submitted: "bg-sky/70 text-foreground",
  under_review: "bg-gold text-gold-foreground",
  needs_action: "bg-destructive/15 text-destructive",
  approved: "bg-mint text-foreground",
  rejected: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  principal_review: "bg-primary/10 text-primary",
  waitlisted: "bg-gold/40 text-foreground",
};