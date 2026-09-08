/**
 * Client-safe vocabulary for student withdrawals / graduations.
 */

export const WITHDRAWAL_KINDS = {
  withdrawal: "انسحاب",
  graduation: "تخرّج",
} as const;

export type WithdrawalKind = keyof typeof WITHDRAWAL_KINDS;

export const WITHDRAWAL_REASONS = {
  transfer_school: "نقل إلى مدرسة أخرى",
  transfer_kindergarten: "نقل إلى روضة أخرى",
  relocation: "انتقال سكن الأسرة",
  travel: "سفر خارج المدينة",
  financial: "أسباب مالية",
  health: "أسباب صحية",
  graduation: "إتمام المرحلة والتخرّج",
  other: "أسباب أخرى",
} as const;

export type WithdrawalReason = keyof typeof WITHDRAWAL_REASONS;

export const WITHDRAWAL_STATUS_LABELS = {
  pending: "قيد التسوية",
  confirmed: "انسحاب مؤكد",
  cancelled: "ملغي",
} as const;

export type WithdrawalStatus = keyof typeof WITHDRAWAL_STATUS_LABELS;

export const WITHDRAWAL_STATUS_STYLES: Record<WithdrawalStatus, string> = {
  pending: "bg-gold/25 text-foreground",
  confirmed: "bg-primary/10 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

/** Arabic month-based duration label between two dates. */
export function durationLabel(from?: string | null, to?: string | null) {
  if (!from) return "—";
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years) parts.push(years === 1 ? "سنة" : years === 2 ? "سنتان" : `${years} سنوات`);
  if (rest) parts.push(rest === 1 ? "شهر" : rest === 2 ? "شهران" : `${rest} أشهر`);
  return parts.length ? parts.join(" و") : "أقل من شهر";
}

export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("ar-SA-u-ca-gregory", { dateStyle: "long" }) : "—";

export const money = (value: number) =>
  `${Number(value || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ريال`;
