import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileClock, Inbox, KeyRound, LayoutDashboard, LogOut, ShieldCheck, UserCog, Users } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "../AuthProvider";
import { P, ROLE_COLORS, ROLE_LABELS } from "../rbac";

const NAV = [
  { to: "/dashboard", label: "لوحة المعلومات", icon: LayoutDashboard, permission: P.dashboardView },
  { to: "/my-applications", label: "طلباتي وتتبع الطلب", icon: FileClock, permission: P.applicationsTrack },
  { to: "/ams", label: "نظام إدارة القبول", icon: Inbox, permission: P.applicationsReview },
  { to: "/profile", label: "ملفي الشخصي", icon: UserCog, permission: P.profileEdit },
  { to: "/admin/users", label: "المستخدمون والأدوار", icon: Users, permission: P.usersView },
  { to: "/admin/permissions", label: "مصفوفة الصلاحيات", icon: KeyRound, permission: P.usersView },
  { to: "/admin/audit", label: "سجل العمليات", icon: ShieldCheck, permission: P.auditView },
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

  const items = NAV.filter((item) => hasPermission(item.permission));

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
              {roles.map((role) => (
                <span
                  key={role}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_COLORS[role]}`}
                >
                  {ROLE_LABELS[role]}
                </span>
              ))}
            </div>

            {isReadOnly && (
              <p className="mt-3 rounded-2xl bg-beige/70 px-3 py-2 text-[11px] font-semibold leading-relaxed text-foreground">
                صلاحيتك للاطّلاع فقط — لا يمكن تنفيذ أي تعديل.
              </p>
            )}

            <nav className="mt-5 space-y-1.5">
              {items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
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