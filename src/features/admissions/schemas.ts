/** Admission journey validation schemas (client-safe). */
import { z } from "zod";

import { RELATIONSHIP_VALUES, relationshipLabel } from "./relationships";

const arabicText = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max);

/** Official Saudi national short address: 4 uppercase letters + 4 digits (DMAG3000). */
export const SHORT_ADDRESS_REGEX = /^[A-Z]{4}\d{4}$/;

const yearsBetween = (iso: string) => {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return NaN;
  const now = new Date();
  let y = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) y -= 1;
  return y;
};

export const parentInfoSchema = z.object({
  nationalId: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"),
  nationality: z.enum(["saudi", "resident"]),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  fullName: arabicText(3, 120, "أدخل الاسم الكامل"),
  gender: z.enum(["male", "female"]),
  birthDate: z
    .string()
    .trim()
    .min(4, "أدخل تاريخ الميلاد")
    .refine((v) => !Number.isNaN(yearsBetween(v)), "تاريخ الميلاد غير صحيح")
    .refine((v) => yearsBetween(v) >= 16, "عمر ولي الأمر يجب ألا يقل عن 16 سنة")
    .refine((v) => yearsBetween(v) <= 100, "يرجى التحقق من تاريخ الميلاد — العمر يتجاوز 100 سنة"),
  mobile: z.string().trim().regex(/^0?5\d{8}$/, "رقم الجوال غير صحيح (05xxxxxxxx)"),
  altMobile: z
    .string()
    .trim()
    .regex(/^0?5\d{8}$/, "رقم الجوال البديل غير صحيح")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(160),
  relationship: z.enum(RELATIONSHIP_VALUES),
  relationshipOther: z.string().trim().max(60).optional().or(z.literal("")),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  employer: z.string().trim().max(120).optional().or(z.literal("")),
  nationalAddress: z
    .string()
    .trim()
    .toUpperCase()
    .regex(SHORT_ADDRESS_REGEX, "الصيغة الصحيحة: 4 أحرف إنجليزية كبيرة ثم 4 أرقام (مثال: DMAG3000)"),
  city: arabicText(2, 60, "أدخل المدينة"),
  district: arabicText(2, 60, "أدخل الحي"),
  mapUrl: z.string().trim().url("رابط الموقع غير صحيح").max(400).optional().or(z.literal("")),
  // Qurra data collected inline when the guardian is a Saudi mother.
  motherIsWorking: z.enum(["yes", "no"]).optional(),
  // Asked when the applicant is NOT the mother: is the child's mother Saudi?
  motherIsSaudi: z.enum(["yes", "no"]).optional(),
  motherNationalId: z
    .string()
    .trim()
    .regex(
      /^1\d{9}$/,
      "رقم هوية الأم يجب أن يكون 10 أرقام ويبدأ بالرقم 1 للدلالة على أنها سعودية",
    )
    .optional()
    .or(z.literal("")),
  motherEmployer: z.string().trim().max(120).optional().or(z.literal("")),
  motherJobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  motherDeclaration: z.boolean().optional(),
})
  .superRefine((v, ctx) => {
    if (v.relationship === "other" && !v.relationshipOther?.trim()) {
      ctx.addIssue({ code: "custom", path: ["relationshipOther"], message: "حدّد صلة القرابة" });
    }
    if (v.nationality === "resident" && !v.country?.trim()) {
      ctx.addIssue({ code: "custom", path: ["country"], message: "اختر بلد الجنسية" });
    }
    if (v.relationship === "mother" && v.nationality === "saudi") {
      if (!v.motherIsWorking) {
        ctx.addIssue({ code: "custom", path: ["motherIsWorking"], message: "حدّد الحالة الوظيفية" });
      }
      if (v.motherIsWorking === "yes" && !v.motherEmployer?.trim()) {
        ctx.addIssue({ code: "custom", path: ["motherEmployer"], message: "أدخل جهة العمل" });
      }
      if (v.motherIsWorking === "yes" && !v.motherJobTitle?.trim()) {
        ctx.addIssue({ code: "custom", path: ["motherJobTitle"], message: "أدخل المسمى الوظيفي" });
      }
      if (!v.motherDeclaration) {
        ctx.addIssue({ code: "custom", path: ["motherDeclaration"], message: "يجب الموافقة على الإقرار" });
      }
    }
    // Any guardian other than the mother may still open a Qurra file for a
    // working Saudi mother, so we collect her details here.
    if (v.relationship !== "mother") {
      if (!v.motherIsSaudi) {
        ctx.addIssue({ code: "custom", path: ["motherIsSaudi"], message: "حدّد ما إذا كانت والدة الطفل سعودية" });
      }
      if (v.motherIsSaudi === "yes") {
        if (!v.motherIsWorking) {
          ctx.addIssue({ code: "custom", path: ["motherIsWorking"], message: "حدّد الحالة الوظيفية للأم" });
        }
        if (v.motherIsWorking === "yes") {
          if (!v.motherNationalId?.trim()) {
            ctx.addIssue({ code: "custom", path: ["motherNationalId"], message: "أدخل رقم هوية الأم" });
          } else if (!/^1\d{9}$/.test(v.motherNationalId.trim())) {
            ctx.addIssue({
              code: "custom",
              path: ["motherNationalId"],
              message:
                "رقم هوية الأم يجب أن يبدأ بالرقم 1 للدلالة على أنها سعودية — دعم قرة متاح للأم السعودية فقط",
            });
          }
          if (!v.motherEmployer?.trim()) {
            ctx.addIssue({ code: "custom", path: ["motherEmployer"], message: "أدخل جهة عمل الأم" });
          }
          if (!v.motherJobTitle?.trim()) {
            ctx.addIssue({ code: "custom", path: ["motherJobTitle"], message: "أدخل المسمى الوظيفي للأم" });
          }
          if (!v.motherDeclaration) {
            ctx.addIssue({ code: "custom", path: ["motherDeclaration"], message: "يجب الموافقة على الإقرار" });
          }
        }
      }
    }
  });

export const childSchema = z.object({
  nameAr: arabicText(3, 120, "أدخل اسم الطفل بالعربية"),
  nameEn: z.string().trim().max(120).optional().or(z.literal("")),
  nationalId: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "رقم هوية الطفل يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().trim().min(4, "أدخل تاريخ الميلاد"),
  nationality: z.string().trim().min(2, "الجنسية تُحدَّد تلقائيًا من رقم الهوية").max(60),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  birthPlace: z.string().trim().max(80).optional().or(z.literal("")),
  photoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  bloodType: z.string().trim().max(6).optional().or(z.literal("")),
  medicalConditions: z.string().trim().max(500).optional().or(z.literal("")),
  allergies: z.string().trim().max(500).optional().or(z.literal("")),
  specialNeeds: z.string().trim().max(500).optional().or(z.literal("")),
  previousSchool: z.string().trim().max(120).optional().or(z.literal("")),
  lastGrade: z.string().trim().max(60).optional().or(z.literal("")),
  vaccinationStatus: z.enum(["complete", "partial", "none"]).optional(),
  stageId: z.string().uuid().optional().or(z.literal("")),
  classroomId: z.string().uuid().optional().or(z.literal("")),
  preference2: z.string().uuid().optional().or(z.literal("")),
  preference3: z.string().uuid().optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.nationalId.startsWith("2") && !v.country?.trim()) {
    ctx.addIssue({ code: "custom", path: ["country"], message: "اختر بلد جنسية الطفل" });
  }
  if (v.preference2 && v.preference3 && v.preference2 === v.preference3) {
    ctx.addIssue({ code: "custom", path: ["preference3"], message: "لا يمكن تكرار نفس الفصل" });
  }
  if (v.classroomId && v.preference2 && v.classroomId === v.preference2) {
    ctx.addIssue({ code: "custom", path: ["preference2"], message: "لا يمكن تكرار الرغبة الأولى" });
  }
  if (v.classroomId && v.preference3 && v.classroomId === v.preference3) {
    ctx.addIssue({ code: "custom", path: ["preference3"], message: "لا يمكن تكرار الرغبة الأولى" });
  }
});

export const childrenSchema = z.array(childSchema).min(1, "أضف طفلًا واحدًا على الأقل").max(6);

/**
 * A Saudi guardian cannot have a resident (iqama) child. Validated separately
 * because it needs the parent's nationality, which lives on another step.
 */
export const SAUDI_PARENT_CHILD_MISMATCH =
  "ولي الأمر سعودي — لا يمكن إدخال رقم إقامة (يبدأ بـ 2) للطفل. يجب أن يبدأ رقم هوية الطفل بالرقم 1.";

export function childNationalityConflicts(
  children: Array<{ nationalId?: string }>,
  parentNationality: "saudi" | "resident" | string | undefined,
): Record<string, string> {
  if (parentNationality !== "saudi") return {};
  const out: Record<string, string> = {};
  children.forEach((c, i) => {
    const id = (c.nationalId ?? "").trim();
    if (id.startsWith("2")) out[`${i}.nationalId`] = SAUDI_PARENT_CHILD_MISMATCH;
  });
  return out;
}

export const qurraSchema = z.object({
  requested: z.boolean(),
  declarationAccepted: z.boolean(),
  motherNationalId: z.string().trim().max(10).optional().or(z.literal("")),
  motherEmploymentStatus: z.string().trim().max(60).optional().or(z.literal("")),
  motherEmployer: z.string().trim().max(120).optional().or(z.literal("")),
  motherJobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ParentInfoInput = z.infer<typeof parentInfoSchema>;
export type ChildInput = z.infer<typeof childSchema>;
export type QurraInput = z.infer<typeof qurraSchema>;

export { relationshipLabel };

export const VACCINATION_LABELS: Record<string, string> = {
  complete: "مكتملة",
  partial: "غير مكتملة",
  none: "لا يوجد",
};

export const emptyChild = (): ChildInput => ({
  nameAr: "",
  nameEn: "",
  nationalId: "",
  gender: "male",
  birthDate: "",
  nationality: "",
  country: "",
  birthPlace: "",
  photoUrl: "",
  bloodType: "",
  medicalConditions: "",
  allergies: "",
  specialNeeds: "",
  previousSchool: "",
  lastGrade: "",
  vaccinationStatus: "complete",
  stageId: "",
  classroomId: "",
  preference2: "",
  preference3: "",
});