/** Step 0 — lightweight seat reservation request (client-safe schemas). */
import { z } from "zod";

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
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-gold text-gold-foreground",
  approved: "bg-mint text-foreground",
  rejected: "bg-destructive/15 text-destructive",
};
