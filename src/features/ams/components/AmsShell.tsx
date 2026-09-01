import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Armchair,
  BarChart3,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  CalendarClock,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Search,
  MessagesSquare,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  TicketCheck,
  UserRoundPlus,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalTrail } from "@/features/auth/components/PortalTrail";
import { ROLE_COLORS, ROLE_LABELS } from "@/features/auth/rbac";
import { cn } from "@/lib/utils";
import { amsQueue } from "../ams.functions";
import { useAmsRealtime } from "../useAmsRealtime";
import { StatusPill } from "./atoms";
import { RegistrationSwitch } from "./RegistrationSwitch";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  roles?: string[];
  group: string;
};

/** Ordered by daily workflow: overview → processing → seats → money → insights → setup. */
const NAV: NavItem[] = [
  { to: "/ams", label: "لوحة المتابعة", icon: LayoutDashboard, exact: true, group: "نظرة عامة" },
  {
    to: "/ams/reservations",
    label: "طلبات الحجز المبدئية",
    icon: TicketCheck,
    exact: false,
    group: "معالجة الطلبات",
  },
  { to: "/ams/queue", label: "طلبات الحجز النهائية", icon: Inbox, exact: false, group: "معالجة الطلبات" },
  { to: "/ams/waiting-list", label: "قائمة الانتظار", icon: ListOrdered, exact: false, group: "معالجة الطلبات" },
  { to: "/ams/activity", label: "الحركة اللحظية", icon: Activity, exact: false, group: "المتابعة والتقارير" },
  { to: "/ams/reports", label: "التقارير", icon: BarChart3, exact: false, group: "المتابعة والتقارير" },
  {
    to: "/ams/seasons",
    label: "مواسم التسجيل",
    icon: CalendarClock,
    exact: false,
    group: "الإعدادات",
    roles: ["admin", "supervisor", "principal", "registration_officer"],
  },
  {
    to: "/ams/form-builder",
    label: "تخصيص نظام التسجيل",
    icon: SlidersHorizontal,
    exact: false,
    group: "الإعدادات",
    roles: ["admin", "supervisor"],
  },
];

const NAV_GROUP_ORDER = [
  "نظرة عامة",
  "معالجة الطلبات",
  "المتابعة والتقارير",
  "الإعدادات",
];

/** Student Affairs is a separate operational module — no admissions links. */
const STUDENTS_NAV: NavItem[] = [
  { to: "/ams/students", label: "سجل الطلاب", icon: GraduationCap, exact: true, group: "شؤون الطلاب" },
  { to: "/ams/seats", label: "الفصول والمقاعد", icon: Armchair, exact: false, group: "شؤون الطلاب" },
  {
    to: "/ams/academic-hub",
    label: "المسار الأكاديمي والأنشطة",
    icon: Sparkles,
    exact: false,
    group: "شؤون الطلاب",
  },
  {
    to: "/ams/students/promotions",
    label: "نقل الطلاب بين المراحل",
    icon: UserRoundPlus,
    exact: false,
    group: "شؤون الطلاب",
  },
];

/** Academic Tracking is a separate operational module — curriculum, assessments, reports. */
const ACADEMICS_NAV: NavItem[] = [
  { to: "/ams/academics", label: "لوحة التتبع الأكاديمي", icon: LayoutDashboard, exact: true, group: "التتبع الأكاديمي" },
  { to: "/ams/academics/chat", label: "محادثة الفصل", icon: MessagesSquare, exact: false, group: "التتبع الأكاديمي" },
  { to: "/ams/academics/curriculum", label: "إدارة المنهج", icon: BookOpen, exact: false, group: "التتبع الأكاديمي" },
  { to: "/ams/academics/plans", label: "الخطط الدراسية", icon: CalendarRange, exact: false, group: "التتبع الأكاديمي" },
  {
    to: "/ams/academics/assignments",
    label: "إسناد المعلمات",
    icon: UsersRound,
    exact: false,
    group: "التتبع الأكاديمي",
  },
  { to: "/ams/academics/assessments", label: "التقييمات", icon: ClipboardCheck, exact: false, group: "التقييم والتقارير" },
  { to: "/ams/academics/reports", label: "التقارير الأكاديمية", icon: BarChart3, exact: false, group: "التقييم والتقارير" },
  {
    to: "/ams/academics/settings",
    label: "الإعدادات",
    icon: Settings,
    exact: false,
    group: "التقييم والتقارير",
    roles: ["admin", "supervisor", "principal"],
  },
];

/** Finance is a separate operational module — no admissions links. */
const FINANCE_NAV: NavItem[] = [
  { to: "/ams/finance", label: "لوحة الإدارة المالية", icon: Wallet, exact: false, group: "الإدارة المالية" },
];

type ModuleKey = "admissions" | "students" | "finance" | "academics";

const MODULES: Record<
  ModuleKey,
  { badge: string; title: string; nav: NavItem[]; groups: string[]; home: string; search: boolean }
> = {
  admissions: { badge: "AMS", title: "نظام إدارة القبول", nav: NAV, groups: NAV_GROUP_ORDER, home: "/ams", search: true },
  students: { badge: "SIS", title: "شؤون الطلاب", nav: STUDENTS_NAV, groups: ["شؤون الطلاب"], home: "/ams/students", search: false },
  academics: {
    badge: "ATS",
    title: "التتبع الأكاديمي",
    nav: ACADEMICS_NAV,
    groups: ["التتبع الأكاديمي", "التقييم والتقارير"],
    home: "/ams/academics",
    search: false,
  },
  finance: { badge: "FIN", title: "الإدارة المالية", nav: FINANCE_NAV, groups: ["الإدارة المالية"], home: "/ams/finance", search: false },
};

function moduleFor(pathname: string): ModuleKey {
  if (pathname.startsWith("/ams/students")) return "students";
  if (pathname.startsWith("/ams/seats")) return "students";
  if (pathname.startsWith("/ams/academic-hub")) return "students";
  if (pathname.startsWith("/ams/academics")) return "academics";
  if (pathname.startsWith("/ams/finance")) return "finance";
  return "admissions";
}

export function AmsShell({
  title,
  description,
  actions,
  children,
  wide,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const { profile, roles, primaryRole, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeModule = MODULES[moduleFor(pathname)];
  const navItems = activeModule.nav.filter(
    (item) => !item.roles || item.roles.some((role) => (roles as string[]).includes(role)),
  );
  const navGroups = activeModule.groups.map((group) => ({
    group,
    items: navItems.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useAmsRealtime();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: searchRows } = useQuery({
    queryKey: ["ams", "queue", "palette"],
    queryFn: () => amsQueue({ data: {} }),
    enabled: paletteOpen && activeModule.search,
  });

  return (
    <div className="min-h-[100dvh] bg-muted/30" dir="rtl">
      <div className={cn("mx-auto flex w-full gap-6 px-4 py-6", wide ? "max-w-[1800px]" : "max-w-[1600px]")}>
        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <RegistrationSwitch />
            <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">
                  {activeModule.badge}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">{activeModule.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">مدارس وروضة المنال</p>
                </div>
              </div>

              <nav className="mt-4 space-y-3.5">
                {navGroups.map((entry) => (
                  <div key={entry.group} className="space-y-1">
                    <p className="px-3 text-[10px] font-black tracking-wide text-muted-foreground/70">
                      {entry.group}
                    </p>
                    {entry.items.map((item) => {
                      const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Home className="size-4" />
                  العودة إلى بوابتي
                </Link>
              </nav>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-sm font-extrabold text-primary">
                  {(profile?.fullName ?? "؟").trim().charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-foreground">{profile?.fullName ?? "مستخدم"}</p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                      primaryRole ? ROLE_COLORS[primaryRole] : "bg-muted",
                    )}
                  >
                    {primaryRole ? ROLE_LABELS[primaryRole] : "—"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-start rounded-xl text-xs font-bold text-muted-foreground"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth", replace: true });
                }}
              >
                <LogOut className="size-3.5" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
          <PortalTrail home={activeModule.home} />
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm backdrop-blur">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-extrabold text-foreground">{title}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-bold text-foreground">
                  <Activity className="size-3" />
                  مباشر
                </span>
              </div>
              {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {activeModule.search && (
                <Button
                  variant="outline"
                  className="rounded-2xl text-xs font-bold"
                  onClick={() => setPaletteOpen(true)}
                >
                  <Search className="size-3.5" />
                  بحث سريع
                  <kbd className="ms-1 rounded bg-muted px-1.5 py-0.5 text-[10px]" dir="ltr">
                    ⌘K
                  </kbd>
                </Button>
              )}
              {actions}
            </div>
          </header>

          <div className="lg:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="whitespace-nowrap rounded-2xl border border-border/60 bg-card px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {children}
        </main>
      </div>

      <CommandDialog open={paletteOpen && activeModule.search} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="ابحث بالرقم الأكاديمي أو اسم الطالب أو ولي الأمر أو الهوية…" />
        <CommandList>
          <CommandEmpty>لا توجد نتائج مطابقة.</CommandEmpty>
          <CommandGroup heading="الطلبات">
            {(searchRows ?? []).slice(0, 40).map((row) => (
              <CommandItem
                key={row.id}
                value={`${row.application_number ?? ""} ${row.parentName} ${row.children.map((c) => `${c.name_ar} ${c.national_id ?? ""}`).join(" ")}`}
                onSelect={() => {
                  setPaletteOpen(false);
                  navigate({ to: "/ams/applications/$applicationId", params: { applicationId: row.id } });
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold">
                    {row.application_number ?? "بدون رقم"} — {row.children[0]?.name_ar ?? row.parentName}
                  </span>
                  <StatusPill status={row.status} />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}