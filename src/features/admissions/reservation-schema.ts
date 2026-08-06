/** Step 0 — lightweight seat reservation request (client-safe schemas). */
import { z } from "zod";

/** Early-validation messages surfaced at Step 0 (حجز المقعد). */
export const DUPLICATE_CHILD_MESSAGE =
  "يوجد طلب مسجّل بنفس رقم هوية الطفل لهذا العام الدراسي. يرجى متابعة الطلب من صفحة (طلباتي) أو التواصل مع إدارة القبول.";
export const CHILD_MATCHES_PARENT_MESSAGE =
  "تنبيه: رقم هوية الطفل مطابقة لرقم هوية ولي الأمر، يرجى التأكد من إدخال رقم هوية الطفل الصحيحة.";

export const reservationChildSchema = z.object({
  nameAr: z.string().trim().min(3, "أدخل اسم الطفل").max(120),
  nationalId: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "رقم هوية الطفل يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().trim().min(4, "أدخل تاريخ الميلاد"),
  stageId: z.string().uuid().optional().or(z.literal("")),
  preference1: z.string().uuid("اختر الرغبة الأولى"),
  preference2: z.string().uuid().optional().or(z.literal("")),
  preference3: z.string().uuid().optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.preference2 && v.preference2 === v.preference1) {
    ctx.addIssue({ code: "custom", path: ["preference2"], message: "لا يمكن تكرار نفس الفصل" });
  }
  if (v.preference3 && (v.preference3 === v.preference1 || v.preference3 === v.preference2)) {
    ctx.addIssue({ code: "custom", path: ["preference3"], message: "لا يمكن تكرار نفس الفصل" });
  }
});

export const reservationSchema = z.object({
  parentName: z.string().trim().min(3, "أدخل اسم ولي الأمر").max(120),
  parentNationalId: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "رقم هوية ولي الأمر يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2"),
  children: z.array(reservationChildSchema).min(1, "أضف طفلًا واحدًا على الأقل").max(6),
}).superRefine((v, ctx) => {
  if (v.parentNationalId.startsWith("1")) {
    v.children.forEach((c, i) => {
      if (c.nationalId.startsWith("2")) {
        ctx.addIssue({
          code: "custom",
          path: ["children", i, "nationalId"],
          message: "ولي الأمر سعودي — يجب أن يبدأ رقم هوية الطفل بالرقم 1.",
        });
      }
    });
  }
  v.children.forEach((c, i) => {
    if (c.nationalId && c.nationalId === v.parentNationalId) {
      ctx.addIssue({
        code: "custom",
        path: ["children", i, "nationalId"],
        message: CHILD_MATCHES_PARENT_MESSAGE,
      });
    }
    const twin = v.children.findIndex((o, j) => j < i && o.nationalId === c.nationalId);
    if (c.nationalId && twin !== -1) {
      ctx.addIssue({
        code: "custom",
        path: ["children", i, "nationalId"],
        message: "تم إدخال نفس رقم الهوية لطفلين في الطلب.",
      });
    }
  });
});

export type ReservationChildInput = z.infer<typeof reservationChildSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;

export const emptyReservationChild = (): ReservationChildInput => ({
  nameAr: "",
  nationalId: "",
  gender: "male",
  birthDate: "",
  stageId: "",
  preference1: "",
  preference2: "",
  preference3: "",
});

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending_review: "بانتظار المراجعة",
  approved: "تم قبول الحجز",
  rejected: "تم رفض الحجز",
  withdrawn: "تم سحب الطلب",
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-gold text-gold-foreground",
  approved: "bg-mint text-foreground",
  rejected: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

/** Parent self-service: edit classroom preferences while still pending. */
export const reservationPreferencesSchema = z.object({
  id: z.string().uuid(),
  children: z
    .array(
      z
        .object({
          childId: z.string().uuid(),
          preference1: z.string().uuid("اختر الرغبة الأولى"),
          preference2: z.string().uuid().optional().or(z.literal("")),
          preference3: z.string().uuid().optional().or(z.literal("")),
        })
        .superRefine((v, ctx) => {
          if (v.preference2 && v.preference2 === v.preference1) {
            ctx.addIssue({ code: "custom", path: ["preference2"], message: "لا يمكن تكرار نفس الفصل" });
          }
          if (v.preference3 && (v.preference3 === v.preference1 || v.preference3 === v.preference2)) {
            ctx.addIssue({ code: "custom", path: ["preference3"], message: "لا يمكن تكرار نفس الفصل" });
          }
        }),
    )
    .min(1),
});

export type ReservationPreferencesInput = z.infer<typeof reservationPreferencesSchema>;

/** Audit-log action labels (سجل التدقيق). */
export const RESERVATION_ACTION_LABELS: Record<string, string> = {
  created: "تم إنشاء طلب الحجز",
  preferences_updated: "تم تعديل رغبات الفصول",
  withdrawn: "تم سحب الطلب من ولي الأمر",
  approved: "تم قبول الحجز وتسكين الأطفال",
  rejected: "تم رفض طلب الحجز",
  application_started: "تم بدء طلب التسجيل من الحجز",
};
