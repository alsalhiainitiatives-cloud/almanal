/**
 * AMS capability matrix (client-safe mirror of the server guard).
 * The database still enforces access through RLS; this only drives the UI.
 */
import type { AppRole } from "@/features/auth/rbac";

export type Capability =
  | "view"
  | "review"
  | "documents"
  | "assign"
  | "recommend"
  | "decide"
  | "seats"
  | "waitlist"
  | "qurra"
  | "notes"
  | "confidential"
  | "payments"
  | "reports"
  | "archive";

const OFFICER: Capability[] = [
  "view",
  "review",
  "documents",
  "assign",
  "recommend",
  "seats",
  "waitlist",
  "qurra",
  "notes",
  "reports",
];

const PRINCIPAL: Capability[] = [
  "view",
  "review",
  "documents",
  "assign",
  "recommend",
  "decide",
  "seats",
  "waitlist",
  "qurra",
  "notes",
  "confidential",
  "reports",
  "archive",
];

export const ROLE_CAPABILITIES: Record<AppRole, Capability[]> = {
  parent: [],
  registration_officer: OFFICER,
  accountant: ["view", "payments", "reports"],
  principal: PRINCIPAL,
  supervisor: ["view", "reports"],
  admin: [
    "view",
    "review",
    "documents",
    "assign",
    "recommend",
    "decide",
    "seats",
    "waitlist",
    "qurra",
    "notes",
    "confidential",
    "payments",
    "reports",
    "archive",
  ],
};

export function capabilitiesFor(roles: AppRole[]): Capability[] {
  const set = new Set<Capability>();
  for (const role of roles) for (const cap of ROLE_CAPABILITIES[role] ?? []) set.add(cap);
  return [...set];
}

export function can(roles: AppRole[], capability: Capability): boolean {
  return roles.some((role) => (ROLE_CAPABILITIES[role] ?? []).includes(capability));
}

export const AMS_ROLES: AppRole[] = [
  "registration_officer",
  "principal",
  "supervisor",
  "accountant",
  "admin",
];

export const PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-sky/60 text-foreground",
  high: "bg-gold text-gold-foreground",
  urgent: "bg-destructive/15 text-destructive",
};

export const SEAT_STATUS_LABELS: Record<string, string> = {
  none: "بدون مقعد",
  held: "محجوز مؤقتًا",
  reserved: "مقعد مؤكد",
  waitlisted: "قائمة الانتظار",
  released: "تم التحرير",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "غير مسدد",
  partial: "سداد جزئي",
  paid: "مسدد",
  waived: "معفى",
};

export const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  replace: "مطلوب استبدال",
};