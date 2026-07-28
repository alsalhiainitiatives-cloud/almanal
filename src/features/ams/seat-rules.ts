/**
 * Shared placement rules for the seat board. Used by the UI for instant
 * feedback and re-checked on the server before any write.
 */
import { ageInMonths, detectNationality, formatAge } from "@/features/admissions/eligibility";

export type SeatChild = {
  id: string;
  name_ar: string;
  birth_date: string | null;
  national_id: string | null;
  nationality: string | null;
  gender: string | null;
  classroom_id: string | null;
  stage_id: string | null;
  application_id: string;
  application_number: string | null;
  application_status: string;
  qurra_requested: boolean;
  qurra_status: string | null;
  mother_employment_status: string | null;
};

export type SeatClassroom = {
  id: string;
  stage_id: string;
  name_ar: string;
  color_hex: string;
  teacher_name: string | null;
  capacity: number;
  enrolled: number;
  waiting: number;
  min_age_months: number;
  max_age_months: number;
};

export type PlacementCheck = { ok: boolean; message?: string; warnings: string[] };

const SAUDI_WORDS = ["سعود", "saudi", "sa"];

export function looksSaudi(value: string | null | undefined) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return SAUDI_WORDS.some((w) => v.includes(w));
}

/** Qurra needs: Saudi child, under 6 years, and a working / studying mother. */
export function qurraIssues(child: SeatChild): string[] {
  if (!child.qurra_requested) return [];
  const issues: string[] = [];
  const months = ageInMonths(child.birth_date);
  const identity = child.national_id ? detectNationality(child.national_id) : null;
  const saudi = identity ? identity === "saudi" : looksSaudi(child.nationality);
  if (saudi === false) issues.push("برنامج قرة للمواطنين فقط، والطفل مسجَّل كمقيم.");
  if (months !== null && months >= 72) issues.push("عمر الطفل يتجاوز 6 سنوات، وهو خارج نطاق دعم قرة.");
  const work = (child.mother_employment_status ?? "").trim();
  if (work && ["unemployed", "غير عاملة", "ربة منزل", "none"].some((w) => work.includes(w))) {
    issues.push("حالة عمل الأم لا تستوفي شرط قرة (يجب أن تكون عاملة أو طالبة).");
  }
  return issues;
}

/** Identity number vs recorded nationality. */
export function identityIssues(child: SeatChild): string[] {
  if (!child.national_id) return [];
  const identity = detectNationality(child.national_id);
  if (!identity) return ["رقم الهوية غير صالح (يجب أن يبدأ بـ1 للمواطن أو 2 للمقيم)."];
  const saudi = looksSaudi(child.nationality);
  if (saudi === true && identity === "resident") return ["الجنسية مسجَّلة كمواطن بينما رقم الهوية رقم إقامة."];
  if (saudi === false && identity === "saudi") return ["الجنسية مسجَّلة كمقيم بينما الرقم هوية وطنية."];
  return [];
}

export function validatePlacement(child: SeatChild, classroom: SeatClassroom): PlacementCheck {
  const warnings = [...identityIssues(child), ...qurraIssues(child)];

  if (child.classroom_id === classroom.id) {
    return { ok: false, message: "الطالب مسكَّن بالفعل في هذا الفصل.", warnings };
  }

  const months = ageInMonths(child.birth_date);
  if (months === null) {
    return { ok: false, message: "تاريخ ميلاد الطالب غير مسجّل — لا يمكن التحقق من شرط العمر.", warnings };
  }

  if (months < classroom.min_age_months || months > classroom.max_age_months) {
    return {
      ok: false,
      message: `شرط العمر لا ينطبق: عمر الطالب ${formatAge(months)} بينما فصل «${classroom.name_ar}» يقبل من ${formatAge(
        classroom.min_age_months,
      )} إلى ${formatAge(classroom.max_age_months)}.`,
      warnings,
    };
  }

  if (classroom.enrolled >= classroom.capacity) {
    return {
      ok: false,
      message: `فصل «${classroom.name_ar}» مكتمل العدد (${classroom.enrolled}/${classroom.capacity}) — استخدم قائمة الانتظار.`,
      warnings,
    };
  }

  return { ok: true, warnings };
}