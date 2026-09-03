import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BabyIcon,
  BookOpen,
  FileClock,
  Globe,
  GraduationCap,
  Inbox,
  CalendarRange,
  ClipboardList,
  MessagesSquare,
  KeyRound,
  Link2,

  LogOut,
  UserCog,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useNotificationCounters } from "@/features/notifications/useNotificationCounters";
import { MODULE_PERMISSIONS, canSeePortalLink, isSuperRole } from "@/features/ams/nav-access";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "../AuthProvider";
import { P, ROLE_COLORS, ROLE_LABELS } from "../rbac";
import { PortalTrail } from "./PortalTrail";


/** Grouped, ordered navigation: personal services → operations → administration. */
const NAV_GROUPS = [
  {
    label: "حسابي",
    items: [
      { to: "/profile", label: "ملفي الشخصي ولوحتي", icon: UserCog, portal: "portal.profile", featured: false },
      {
        to: "/link-children",
        label: "ربط أبنائي",
        icon: Link2,
        portal: "portal.children_link",
        featured: false,
        parentOnly: true,
      },
    ],
  },
  {
    label: "طلبات الالتحاق",
    items: [
      { to: "/my-applications", label: "طلباتي وتتبع الطلب", icon: FileClock, portal: "portal.applications", featured: false },
    ],
  },
  {
    label: "متابعة طفلي",
    items: [
      { to: "/child-file", label: "ملف الطفل", icon: BabyIcon, portal: "portal.child_file", featured: false },
      {
        to: "/child-reports",
        label: "تقارير طفلي الأكاديمية",
        icon: ClipboardList,
        portal: "portal.child_reports",
        featured: false,
      },
      {
        to: "/study-plans",
        label: "خطة طفلي الدراسية",
        icon: CalendarRange,
        portal: "portal.study_plan",
        featured: false,
        notifyKind: "study_plan",
      },
      {
        to: "/class-chat",
        label: "محادثة فصل طفلي",
        icon: MessagesSquare,
        portal: "portal.class_chat",
        featured: false,
        notifyKind: "chat_message",
      },
    ],
  },
  {
    label: "الرسوم والمدفوعات",
    items: [
      { to: "/payments", label: "المدفوعات والرسوم", icon: Wallet, portal: "portal.payments", featured: false },
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
    ],
  },
  {
    label: "إدارة النظام",
    items: [
      { to: "/ams/website", label: "الموقع الإلكتروني", icon: Globe, permission: P.applicationsReview, featured: true },
      { to: "/ams/system", label: "إعدادات النظام", icon: KeyRound, permission: P.usersView, featured: true },
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
  const { profile, roles, permissions, hasPermission, signOut, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const counters = useNotificationCounters();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isStaffAccount = (roles as string[]).some((role) => role !== "parent");


  const superRole = isSuperRole(roles as string[]);

  /** Module tabs open when the user holds ANY permission inside that module. */
  function visible(item: (typeof NAV_GROUPS)[number]["items"][number]): boolean {
    // Parent-portal items are governed only by their explicit `portal.*`
    // permission — no super-role bypass — so admins can be excluded from them.
    if ("portal" in item && item.portal) {
      if ("parentOnly" in item && item.parentOnly && isStaffAccount) return false;
      return canSeePortalLink(item.to, permissions);
    }
    if ("parentOnly" in item && item.parentOnly && isStaffAccount) return false;
    if (superRole && item.featured) return true;
    const moduleCodes = MODULE_PERMISSIONS[item.to];
    if (moduleCodes && moduleCodes.some((code) => permissions.includes(code))) return true;
    if (hasPermission(item.permission)) return true;
    return "role" in item && (roles as string[]).includes(item.role as string);
  }

  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(visible),
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
              <UserAvatar
                name={profile?.fullName}
                src={profile?.avatarUrl}
                className="size-12 shrink-0 rounded-2xl"
                fallbackClassName="rounded-2xl text-lg font-extrabold"
              />
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
                    const count =
                      "notifyKind" in item ? (counters[item.notifyKind as string] ?? 0) : 0;
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
                        {count > 0 ? (
                          <span
                            className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                              active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
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