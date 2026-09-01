import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BabyIcon,
  BookOpen,
  FileClock,
  Globe,
  GraduationCap,
  HeartHandshake,
  Inbox,
  MessagesSquare,
  KeyRound,
  LogOut,
  Sparkles,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "../AuthProvider";
import { P, ROLE_COLORS, ROLE_LABELS } from "../rbac";
import { PortalTrail } from "./PortalTrail";

/** Grouped, ordered navigation: personal services → operations → administration. */
const NAV_GROUPS = [
  {
    label: "حسابي وطلباتي",
    items: [
      { to: "/profile", label: "ملفي الشخصي ولوحتي", icon: UserCog, permission: P.profileEdit, featured: false },
      { to: "/my-applications", label: "طلباتي وتتبع الطلب", icon: FileClock, permission: P.applicationsTrack, featured: false },
      { to: "/child-file", label: "ملف الطفل", icon: BabyIcon, permission: P.applicationsTrack, featured: false },
      {
        to: "/child-journey",
        label: "يوميات طفلي",
        icon: HeartHandshake,
        permission: P.applicationsTrack,
        featured: true,
      },
      {
        to: "/class-chat",
        label: "محادثة فصل طفلي",
        icon: MessagesSquare,
        permission: P.applicationsTrack,
        featured: false,
      },
      { to: "/payments", label: "المدفوعات والرسوم", icon: Wallet, permission: P.applicationsTrack, featured: false },
    ],
  },
  {
    label: "العمل التشغيلي",
    items: [
      { to: "/ams", label: "نظام إدارة القبول", icon: Inbox, permission: P.applicationsReview, featured: true },
      {
        to: "/ams/students",
        label: "شؤون الطلاب",
        icon: GraduationCap,
        permission: P.applicationsReview,
        featured: true,
      },
      {
        to: "/ams/finance",
        label: "الإدارة المالية",
        icon: Wallet,
        permission: P.paymentsManage,
        featured: true,
      },
      {
        to: "/ams/academics",
        label: "التتبع الأكاديمي",
        icon: BookOpen,
        permission: P.applicationsReview,
        role: "teacher" as const,
        featured: true,
      },
      {
        to: "/ams/academic-hub",
        label: "المسار الأكاديمي والأنشطة",
        icon: Sparkles,
        permission: P.applicationsReview,
        role: "teacher" as const,
        featured: true,
      },
    ],
  },
  {
    label: "إدارة النظام",
    items: [
      { to: "/admin/site-content", label: "إعدادات الموقع الإلكتروني", icon: Globe, permission: P.settingsManage, featured: true },
      { to: "/admin/inbox", label: "استقبال المراسلات والتقييمات", icon: MessagesSquare, permission: P.applicationsReview, featured: false },
      { to: "/admin/users", label: "المستخدمون والأدوار", icon: Users, permission: P.usersView, featured: false },
      { to: "/admin/permissions", label: "مصفوفة الصلاحيات", icon: KeyRound, permission: P.usersView, featured: false },
      { to: "/admin/audit", label: "سجل العمليات", icon: ShieldCheck, permission: P.auditView, featured: false },
    ],
  },
] as const;

export function PortalLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { profile, roles, hasPermission, signOut, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) =>
        hasPermission(item.permission) ||
        ("role" in item && (roles as string[]).includes(item.role as string)),
    ),
  })).filter((group) => group.items.length > 0);

  async function handleSignOut() {
    await signOut();
    toast.success("تم تسجيل الخروج بنجاح");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="gradient-soft-cream min-h-[80vh] py-10">
      <div className="container mx-auto grid gap-8 px-4 lg:grid-cols-[280px_1fr]">
        {/* Side navigation */}
        <aside className="no-print lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">
                {(profile?.fullName ?? "؟").trim().charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {profile?.fullName ?? "مستخدم"}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {profile?.email ?? ""}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {[...new Set(roles.map((role) => ROLE_LABELS[role]))].map((label) => (
                <span
                  key={label}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    ROLE_COLORS[roles.find((r) => ROLE_LABELS[r] === label)!]
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>

            {isReadOnly && (
              <p className="mt-3 rounded-2xl bg-beige/70 px-3 py-2 text-[11px] font-semibold leading-relaxed text-foreground">
                صلاحيتك للاطّلاع فقط — لا يمكن تنفيذ أي تعديل.
              </p>
            )}

            <nav className="mt-5 space-y-4">
              {groups.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="px-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground/70">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const active =
                      item.to === "/ams"
                        ? pathname === "/ams" ||
                          (pathname.startsWith("/ams/") &&
                            !pathname.startsWith("/ams/students") &&
                            !pathname.startsWith("/ams/finance") &&
                            !pathname.startsWith("/ams/academics"))
                        : pathname === item.to || pathname.startsWith(`${item.to}/`);
                    const featured = item.featured;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2.5 rounded-2xl px-3.5 text-sm font-bold transition-colors ${
                          featured ? "py-3 text-[0.95rem]" : "py-2.5"
                        } ${
                          active
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : featured
                              ? "bg-gradient-to-l from-gold/25 to-primary/10 text-foreground ring-1 ring-gold/50 hover:from-gold/35"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <item.icon className="size-4" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="mt-5 w-full rounded-2xl border-border/70 font-bold"
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        {/* Content */}
        <div>
          <div className="mb-4">
            <PortalTrail />
          </div>
          <header className="no-print rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-soft backdrop-blur sm:p-8">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </header>
          <div className="mt-6 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}