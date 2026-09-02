/**
 * Client-safe helpers for the "Guardian Linking" screen: invitation links,
 * WhatsApp templates and status labels.
 */

export type InvitationStatus = "pending" | "accepted" | "revoked";

export const INVITATION_LABELS: Record<InvitationStatus, string> = {
  pending: "بانتظار التسجيل",
  accepted: "مرتبط بالحساب",
  revoked: "ملغاة",
};

export const INVITATION_STYLES: Record<InvitationStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  accepted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  revoked: "border-border/60 bg-muted text-muted-foreground",
};

/** Public invitation URL a guardian can open on any device. */
export function inviteUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/invite/${token}`;
}

/** Ready-to-send Arabic WhatsApp invitation. */
export function inviteMessage(input: {
  parentName: string | null;
  childName: string;
  url: string;
  schoolName?: string;
}) {
  const school = input.schoolName ?? "مدارس وروضة المنال";
  return [
    `السلام عليكم ${input.parentName?.trim() || "ولي الأمر"} 👋`,
    "",
    `نودّ دعوتكم لتفعيل حساب ولي الأمر في منصة ${school} لمتابعة ابنكم/ابنتكم «${input.childName}».`,
    "",
    "من خلال الحساب يمكنكم:",
    "• متابعة الخطط الدراسية والتقارير والتقييمات",
    "• الاطلاع على الحضور والغياب",
    "• متابعة الفواتير وسداد الدفعات",
    "• التواصل مع معلمة الفصل",
    "",
    "رابط الدعوة الخاص بكم (لا تشاركوه مع أحد):",
    input.url,
    "",
    "سجّلوا بالبريد الإلكتروني ثم سيتم ربط أبنائكم بحسابكم تلقائيًا.",
  ].join("\n");
}
