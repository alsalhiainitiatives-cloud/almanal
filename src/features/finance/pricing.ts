/**
 * Client-safe financial engine: fee units, discounts, installment schedules.
 * The same helpers run on the server so parent, officer and accountant always
 * see identical numbers.
 */

export type FeeUnit = "month" | "term" | "two_terms" | "year";

export type FeePlanRow = {
  id: string;
  stage_id: string | null;
  classroom_id: string | null;
  academic_year: string;
  label_ar: string | null;
  amount: number;
  unit: string;
  terms_per_year: number;
  months_per_year: number;
  admission_fee: number;
  is_active: boolean;
};

export type PlanSettingsRow = {
  id: string;
  academic_year: string;
  allow_full: boolean;
  full_discount_percent: number;
  allowed_installments: number[];
  max_installments: number;
  down_payment_percent: number;
  due_day: number;
  first_due_offset_days: number;
  late_after_days: number;
};

export type DiscountRuleRow = {
  id: string;
  name_ar: string;
  description_ar: string | null;
  kind: string;
  value: number;
  condition: string;
  min_children: number;
  max_amount: number | null;
  sort_order: number;
  is_active: boolean;
};

export type BankAccountRow = {
  id: string;
  org_name_ar: string;
  school_name_ar: string;
  logo_url: string | null;
  account_holder: string;
  bank_name: string;
  account_number: string | null;
  iban: string | null;
  notes_ar: string | null;
  is_default: boolean;
  is_active: boolean;
};

export const FEE_UNIT_LABELS: Record<string, string> = {
  month: "شهريًا",
  term: "لكل ترم",
  two_terms: "لكل ترمين",
  year: "للسنة الكاملة",
};

export const DISCOUNT_CONDITION_LABELS: Record<string, string> = {
  sibling: "خصم الإخوة",
  staff: "أبناء المنسوبين",
  orphan: "الأيتام",
  early_payment: "السداد دفعة واحدة",
  manual: "خصم يدوي",
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  due: "مستحقة",
  pending_review: "بانتظار اعتماد الإيصال",
  paid: "مسددة",
  waived: "معفاة",
  cancelled: "ملغاة",
};

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

/** Yearly tuition for one child, whatever unit the plan is priced in. */
export function annualTuition(
  plan: Pick<FeePlanRow, "amount" | "unit" | "terms_per_year" | "months_per_year">,
) {
  const amount = Number(plan.amount) || 0;
  switch (plan.unit as FeeUnit) {
    case "month":
      return amount * (plan.months_per_year || 9);
    case "term":
      return amount * (plan.terms_per_year || 2);
    case "two_terms":
      return amount * Math.max(1, (plan.terms_per_year || 2) / 2);
    default:
      return amount;
  }
}

export type QuoteLine = { label: string; amount: number };

export type Quote = {
  childCount: number;
  admissionFee: number;
  tuition: number;
  servicesTotal: number;
  discounts: QuoteLine[];
  discountTotal: number;
  qurraCovered: boolean;
  qurraAmount: number;
  payableTotal: number;
  grandTotal: number;
};

export function computeQuote(input: {
  childCount: number;
  admissionFeePerChild: number;
  tuitionPerChild: number;
  services: { name: string; price: number }[];
  planType: "full" | "installments";
  settings?: Pick<PlanSettingsRow, "full_discount_percent"> | null;
  discountRules?: DiscountRuleRow[];
  qurraCovered?: boolean;
}): Quote {
  const childCount = Math.max(1, input.childCount);
  const admissionFee = round(input.admissionFeePerChild * childCount);
  const tuition = round(input.tuitionPerChild * childCount);
  const servicesTotal = round(input.services.reduce((sum, s) => sum + Number(s.price || 0), 0));
  const qurraCovered = Boolean(input.qurraCovered);

  const base = qurraCovered ? 0 : tuition;
  const discounts: QuoteLine[] = [];

  for (const rule of (input.discountRules ?? []).filter((r) => r.is_active)) {
    if (rule.condition === "sibling" && childCount < Math.max(2, rule.min_children)) continue;
    if (rule.condition === "early_payment" && input.planType !== "full") continue;
    if (rule.condition === "staff" || rule.condition === "orphan" || rule.condition === "manual") {
      continue;
    }
    let amount = rule.kind === "percent" ? (base * Number(rule.value)) / 100 : Number(rule.value);
    if (rule.max_amount) amount = Math.min(amount, Number(rule.max_amount));
    amount = round(Math.min(amount, base));
    if (amount > 0) discounts.push({ label: rule.name_ar, amount });
  }

  const discountTotal = round(Math.min(discounts.reduce((a, b) => a + b.amount, 0), base));
  const payableTotal = round(admissionFee + base + servicesTotal - discountTotal);

  return {
    childCount,
    admissionFee,
    tuition,
    servicesTotal,
    discounts,
    discountTotal,
    qurraCovered,
    qurraAmount: qurraCovered ? tuition : 0,
    payableTotal,
    grandTotal: round(admissionFee + tuition + servicesTotal - discountTotal),
  };
}

export type ScheduleRow = { seq: number; amount: number; dueDate: string };

/** Splits a payable total across N monthly installments. */
export function buildSchedule(input: {
  total: number;
  count: number;
  settings?: Pick<
    PlanSettingsRow,
    "down_payment_percent" | "due_day" | "first_due_offset_days"
  > | null;
  startDate?: Date;
}): ScheduleRow[] {
  const total = round(Math.max(0, input.total));
  const count = Math.min(12, Math.max(1, Math.round(input.count)));
  const start = input.startDate ? new Date(input.startDate) : new Date();
  const offset = Number(input.settings?.first_due_offset_days ?? 7);
  const dueDay = Number(input.settings?.due_day ?? 5);
  const downPercent = Number(input.settings?.down_payment_percent ?? 0);

  const first = new Date(start);
  first.setDate(first.getDate() + offset);

  if (count === 1) return [{ seq: 1, amount: total, dueDate: iso(first) }];

  let down = downPercent > 0 ? round((total * downPercent) / 100) : round(total / count);
  down = Math.min(down, total);
  const rest = round(total - down);
  const per = Math.floor(rest / (count - 1));
  const rows: ScheduleRow[] = [{ seq: 1, amount: down, dueDate: iso(first) }];

  let allocated = down;
  for (let i = 2; i <= count; i++) {
    const amount = i === count ? round(total - allocated) : per;
    allocated = round(allocated + amount);
    const due = new Date(first.getFullYear(), first.getMonth() + (i - 1), dueDay);
    rows.push({ seq: i, amount, dueDate: iso(due) });
  }
  return rows;
}

export function installmentOptions(settings?: PlanSettingsRow | null) {
  const max = settings?.max_installments ?? 12;
  const allowed = (settings?.allowed_installments ?? [1, 2, 3, 4, 6, 9, 12]).filter(
    (n) => n >= 1 && n <= max,
  );
  const list = allowed.length ? allowed : [1];
  return [...new Set(list)].sort((a, b) => a - b);
}

export function isOverdue(row: { due_date: string; status: string }, lateAfterDays = 0) {
  if (row.status === "paid" || row.status === "waived" || row.status === "cancelled") return false;
  const due = new Date(row.due_date);
  due.setDate(due.getDate() + lateAfterDays);
  return due.getTime() < Date.now();
}

export const money = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("ar-SA")} ر.س`;

export const dateAr = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
    : "—";

export function fillTemplate(
  template: string,
  values: Record<string, string | number | undefined | null>,
) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value ?? "")),
    template,
  );
}

/** Builds a direct WhatsApp link for a Saudi mobile number (05xxxxxxxx or 9665xxxxxxxx). */
export function whatsappUrl(phone: string | null | undefined, text: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  let intl = digits;
  if (intl.startsWith("00")) intl = intl.slice(2);
  if (intl.startsWith("0")) intl = `966${intl.slice(1)}`;
  if (!intl.startsWith("966")) intl = `966${intl}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

function round(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}