import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, Home } from "lucide-react";

/** Human labels for portal path segments (used by the breadcrumb trail). */
const SEGMENT_LABELS: Record<string, string> = {
  profile: "ملفي الشخصي",
  "my-applications": "طلباتي وتتبع الطلب",
  payments: "المدفوعات والرسوم",
  apply: "طلب تسجيل جديد",
  new: "طلب جديد",
  track: "تتبع الطلب",
  ams: "نظام إدارة القبول",
  queue: "قائمة الطلبات",
  applications: "تفاصيل الطلب",
  seats: "إدارة المقاعد",
  "waiting-list": "قائمة الانتظار",
  finance: "المالية",
  reports: "المتابعة والتقارير",
  activity: "سجل النشاط",
  "form-builder": "تخصيص نظام التسجيل",
  admin: "إدارة النظام",
  users: "المستخدمون والأدوار",
  permissions: "مصفوفة الصلاحيات",
  audit: "سجل العمليات",
  "site-content": "إعدادات الموقع الإلكتروني",
};

function labelFor(segment: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // dynamic ids (uuid / token) → shortened reference
  if (segment.length > 12) return `#${segment.slice(0, 6)}`;
  return segment;
}

/**
 * Shows the user's current location inside the portal, allows jumping back to
 * any ancestor step, and offers a one-click "back" action.
 */
export function PortalTrail() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: labelFor(segment),
    to: `/${segments.slice(0, index + 1).join("/")}`,
    isLast: index === segments.length - 1,
  }));

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (crumbs.length > 1) navigate({ to: crumbs[crumbs.length - 2]!.to as never });
          else navigate({ to: "/profile" });
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="size-3.5 rtl:rotate-180" />
        رجوع
      </button>

      <nav
        aria-label="مسار التنقّل"
        className="flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[11px] font-bold"
      >
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Home className="size-3.5" />
          البوابة
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.to} className="inline-flex items-center gap-1">
            <span className="text-muted-foreground/50">/</span>
            {crumb.isLast ? (
              <span className="text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.to as never}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
