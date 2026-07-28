import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Armchair,
  BarChart3,
  Inbox,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Search,
  SlidersHorizontal,
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
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ROLE_COLORS, ROLE_LABELS } from "@/features/auth/rbac";
import { cn } from "@/lib/utils";
import { amsQueue } from "../ams.functions";
import { useAmsRealtime } from "../useAmsRealtime";
import { StatusPill } from "./atoms";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  roles?: string[];
};

const NAV: NavItem[] = [
  { to: "/ams", label: "لوحة المتابعة", icon: LayoutDashboard, exact: true },
  { to: "/ams/queue", label: "قائمة الطلبات", icon: Inbox, exact: false },
  { to: "/ams/seats", label: "إدارة  الفصول والمقاعد", icon: Armchair, exact: false },
  { to: "/ams/waiting-list", label: "قائمة الانتظار", icon: ListOrdered, exact: false },
  { to: "/ams/activity", label: "الحركة اللحظية", icon: Activity, exact: false },
  { to: "/ams/reports", label: "التقارير", icon: BarChart3, exact: false },
  {
    to: "/ams/form-builder",
    label: "إدارة وتخصيص نظام التسجيل",
    icon: SlidersHorizontal,
    exact: false,
    roles: ["admin", "supervisor"],
  },
];

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
  const navItems = NAV.filter(
    (item) => !item.roles || item.roles.some((role) => (roles as string[]).includes(role)),
  );
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
    enabled: paletteOpen,
  });

  return (
    <div className="min-h-[100dvh] bg-muted/30" dir="rtl">
      <div className={cn("mx-auto flex w-full gap-6 px-4 py-6", wide ? "max-w-[1800px]" : "max-w-[1600px]")}>
        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">
                  AMS
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">نظام إدارة القبول</p>
                  <p className="truncate text-[11px] text-muted-foreground">مدارس وروضة المنال</p>
                </div>
              </div>

              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
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
              <NotificationBell />
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

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="ابحث برقم الطلب أو اسم الطالب أو ولي الأمر أو الهوية…" />
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