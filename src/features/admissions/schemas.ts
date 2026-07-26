/** Admission journey validation schemas (client-safe). */
import { z } from "zod";

const arabicText = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max);

export const parentInfoSchema = z.object({
  nationalId: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "رقم الهوية يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"),
  nationality: z.enum(["saudi", "resident"]),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  fullName: arabicText(3, 120, "أدخل الاسم الكامل"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().trim().min(4, "أدخل تاريخ الميلاد"),
  mobile: z.string().trim().regex(/^0?5\d{8}$/, "رقم الجوال غير صحيح (05xxxxxxxx)"),
  altMobile: z
    .string()
    .trim()
    .regex(/^0?5\d{8}$/, "رقم الجوال البديل غير صحيح")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("البريد الإلكتروني غير صحيح").max(160),
  relationship: z.enum(["father", "mother", "guardian"]),
  occupation: z.string().trim().max(120).optional().or(z.literal("")),
  employer: z.string().trim().max(120).optional().or(z.literal("")),
  nationalAddress: arabicText(5, 200, "أدخل العنوان الوطني"),
  city: arabicText(2, 60, "أدخل المدينة"),
  district: arabicText(2, 60, "أدخل الحي"),
  mapUrl: z.string().trim().url("رابط الموقع غير صحيح").max(400).optional().or(z.literal("")),
});

export const childSchema = z.object({
  nameAr: arabicText(3, 120, "أدخل اسم الطفل بالعربية"),
  nameEn: z.string().trim().max(120).optional().or(z.literal("")),
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "رقم هوية الطفل يجب أن يكون 10 أرقام"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().trim().min(4, "أدخل تاريخ الميلاد"),
  nationality: z.string().trim().min(2, "أدخل الجنسية").max(60),
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
});

export const childrenSchema = z.array(childSchema).min(1, "أضف طفلًا واحدًا على الأقل").max(6);

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

export const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "الأب",
  mother: "الأم",
  guardian: "ولي أمر",
};

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
  nationality: "سعودي",
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
});