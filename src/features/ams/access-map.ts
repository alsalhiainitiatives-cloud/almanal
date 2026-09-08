/**
 * Human-readable map of the platform surface: every module tab and the links
 * inside it. Used by the role visibility screen to explain — per role — which
 * tabs appear and which inner pages open.
 */
import { LINK_PERMISSIONS, MODULE_PERMISSIONS, PORTAL_PERMISSIONS, isSuperRole } from "./nav-access";

export type AccessLink = { to: string; label: string };
export type AccessModule = { to: string; label: string; links: AccessLink[] };

export const ACCESS_MAP: AccessModule[] = [
  {
    to: "/profile",
    label: "بوابة ولي الأمر",
    links: [
      { to: "/profile", label: "ملفي الشخصي ولوحتي" },
      { to: "/link-children", label: "ربط أبنائي" },
      { to: "/my-applications", label: "طلباتي وتتبع الطلب" },
      { to: "/child-file", label: "ملف الطفل" },
      { to: "/child-reports", label: "تقارير طفلي الأكاديمية" },
      { to: "/study-plans", label: "خطة طفلي الدراسية" },
      { to: "/class-chat", label: "محادثة فصل طفلي" },
      { to: "/payments", label: "المدفوعات والرسوم" },
    ],
  },
  {
    to: "/ams",
    label: "نظام إدارة القبول",
    links: [
      { to: "/ams", label: "لوحة المتابعة" },
      { to: "/ams/reservations", label: "طلبات الحجز المبدئية" },
      { to: "/ams/queue", label: "طلبات الحجز النهائية" },
      { to: "/ams/waiting-list", label: "قائمة الانتظار" },
      { to: "/ams/activity", label: "الحركة اللحظية" },
      { to: "/ams/reports", label: "التقارير" },
    ],
  },
  {
    to: "/ams/students",
    label: "شؤون الطلاب",
    links: [
      { to: "/ams/students", label: "لوحة شؤون الطلاب" },
      { to: "/ams/students/registry", label: "سجل الطلاب" },
      { to: "/ams/seats", label: "الفصول والمقاعد" },
      { to: "/ams/students/attendance", label: "الحضور والغياب" },
      { to: "/ams/students/guardians", label: "ربط أولياء الأمور" },
      { to: "/ams/students/data", label: "استيراد وتصدير البيانات" },
      { to: "/ams/students/promotions", label: "ترقية الطلاب" },
      { to: "/ams/students/withdrawals", label: "انسحاب الطلاب والخريجون" },
    ],
  },
  {
    to: "/ams/academics",
    label: "التتبع الأكاديمي",
    links: [
      { to: "/ams/academics", label: "لوحة التتبع الأكاديمي" },
      { to: "/ams/academics/chat", label: "محادثة الفصل" },
      { to: "/ams/academics/curriculum", label: "إدارة المنهج" },
      { to: "/ams/academics/plans", label: "الخطط الدراسية" },
      { to: "/ams/academics/calendar", label: "تقويم الفصل" },
      { to: "/ams/academics/assignments", label: "إسناد المعلمات" },
      { to: "/ams/academics/assessments", label: "التقييمات" },
      { to: "/ams/academics/reports", label: "التقارير الأكاديمية" },
      { to: "/ams/academics/settings", label: "إعدادات التتبع الأكاديمي" },
    ],
  },
  {
    to: "/ams/finance",
    label: "الإدارة المالية",
    links: [
      { to: "/ams/finance", label: "لوحة الإدارة المالية" },
      { to: "/ams/finance/invoices", label: "الفواتير والسداد" },
      { to: "/ams/finance/claims", label: "مطالبات وإشعارات" },
      { to: "/ams/finance/reports", label: "التقارير المالية" },
      { to: "/ams/finance/settings", label: "الإعدادات المالية" },
    ],
  },
  {
    to: "/ams/website",
    label: "الموقع الإلكتروني",
    links: [
      { to: "/ams/website", label: "لوحة الموقع الإلكتروني" },
      { to: "/ams/website/settings", label: "إعدادات المحتوى" },
      { to: "/ams/website/inbox", label: "المراسلات الواردة" },
      { to: "/ams/website/reviews", label: "التقييمات والآراء" },
      { to: "/ams/website/surveys", label: "الاستبانات وآراء أولياء الأمور" },
    ],
  },
  {
    to: "/ams/system",
    label: "إعدادات النظام",
    links: [
      { to: "/ams/system", label: "لوحة إعدادات النظام" },
      { to: "/ams/system/users", label: "المستخدمون والأدوار" },
      { to: "/ams/system/permissions", label: "مصفوفة الصلاحيات" },
      { to: "/ams/system/audit", label: "سجل العمليات" },
      { to: "/ams/system/registration", label: "إعدادات نظام التسجيل" },
    ],
  },
];

/** Permission codes required (any-of) for a link; empty means always visible. */
export function linkRequirements(to: string): string[] {
  const portal = PORTAL_PERMISSIONS[to];
  if (portal) return [portal];
  return LINK_PERMISSIONS[to] ?? [];
}

/** Resolve visibility of every module/link for a given role permission set. */
export function resolveAccess(role: string, permissions: readonly string[]) {
  const superRole = isSuperRole([role]);
  return ACCESS_MAP.map((module) => {
    const isPortal = module.to === "/profile";
    const moduleCodes = MODULE_PERMISSIONS[module.to] ?? [];
    const links = module.links.map((link) => {
      const required = linkRequirements(link.to);
      // Parent-portal items never inherit the super-role bypass.
      const visible = isPortal
        ? required.some((c) => permissions.includes(c))
        : superRole || required.length === 0 || required.some((c) => permissions.includes(c));
      return { ...link, required, visible };
    });
    const moduleVisible = isPortal
      ? links.some((l) => l.visible)
      : superRole || moduleCodes.length === 0 || moduleCodes.some((c) => permissions.includes(c));
    return { ...module, moduleVisible, superRole, links };
  });
}
