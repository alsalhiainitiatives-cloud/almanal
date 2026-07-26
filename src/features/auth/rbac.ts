/**
 * RBAC catalog (client-safe).
 *
 * Roles and permissions are enforced in the database (RLS + `has_role` /
 * `has_permission`). This module only provides labels and typed constants so the
 * UI can render role names and hide controls the user cannot use.
 */
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export const ALL_ROLES: AppRole[] = [
  "parent",
  "registration_officer",
  "accountant",
  "principal",
  "supervisor",
  "admin",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  parent: "ولي أمر",
  registration_officer: "مسؤول التسجيل",
  accountant: "المحاسب",
  principal: "مدير المدرسة",
  supervisor: "المشرف العام",
  admin: "مدير النظام",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  parent: "إدارة الأبناء، تقديم الطلبات، رفع المستندات، متابعة الفواتير والسداد.",
  registration_officer:
    "مراجعة الطلبات والتحقق من المستندات وإرجاع الناقص وتحويل المكتمل — بدون اعتماد نهائي.",
  accountant: "الفواتير والمدفوعات وطباعة السندات والتقارير المالية — بدون صلاحية قبول.",
  principal: "الصلاحية التنفيذية الكاملة: الاعتماد، الرفض، طلب التعديل، توزيع الفصول، حالة التسجيل.",
  supervisor: "اطّلاع فقط: الإحصاءات واللوحات والتقارير ومؤشرات الأداء — بدون أي تنفيذ أو تعديل.",
  admin: "إدارة المستخدمين والأدوار والصلاحيات وإعدادات النظام — بدون اعتماد قبول الطلاب.",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  parent: "bg-sky/60 text-foreground",
  registration_officer: "bg-mint/70 text-foreground",
  accountant: "bg-lavender/70 text-foreground",
  principal: "bg-primary text-primary-foreground",
  supervisor: "bg-beige text-foreground",
  admin: "bg-gold text-gold-foreground",
};

export const READ_ONLY_ROLES: AppRole[] = ["supervisor"];

export const PERMISSION_CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  users: "المستخدمون والصلاحيات",
  students: "الطلاب",
  applications: "طلبات التسجيل",
  documents: "المستندات",
  finance: "المالية",
  reports: "التقارير",
  settings: "الإعدادات",
};

/** Permission keys used by the UI. Source of truth is `public.permissions`. */
export const P = {
  dashboardView: "dashboard.view",
  profileEdit: "profile.edit",
  usersView: "users.view",
  usersCreate: "users.create",
  usersEdit: "users.edit",
  usersDelete: "users.delete",
  rolesManage: "roles.manage",
  permissionsManage: "permissions.manage",
  auditView: "audit.view",
  childrenManage: "children.manage",
  applicationsSubmit: "applications.submit",
  applicationsReview: "applications.review",
  applicationsApprove: "applications.approve",
  paymentsManage: "payments.manage",
  reportsView: "reports.view",
  settingsManage: "settings.manage",
} as const;

export function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value) && value.length >= 10) score++;
  const meta = [
    { label: "ضعيفة جدًا", color: "bg-destructive" },
    { label: "ضعيفة", color: "bg-destructive" },
    { label: "متوسطة", color: "bg-gold" },
    { label: "قوية", color: "bg-mint" },
    { label: "قوية جدًا", color: "bg-primary" },
  ][score];
  return { score: score as 0 | 1 | 2 | 3 | 4, label: meta.label, color: meta.color };
}