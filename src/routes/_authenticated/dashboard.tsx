import { createFileRoute } from "@tanstack/react-router";
import { Clock, Monitor, ShieldCheck, Sparkles } from "lucide-react";

import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/features/auth/rbac";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المعلومات | بوابة المنال" },
      {
        name: "description",
        content: "لوحة معلومات بوابة مدارس وروضة المنال: صلاحياتك، جلساتك النشطة وآخر دخول.",
      },
      { property: "og:title", content: "لوحة المعلومات | بوابة المنال" },
      { property: "og:description", content: "متابعة الصلاحيات والجلسات في بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DashboardPage() {
  const { profile, roles, permissions, primaryRole, loadingContext } = useAuth();

  return (
    <PortalLayout
      title={`أهلًا بك، ${profile?.fullName?.split(" ")[0] ?? "زائرنا الكريم"} 👋`}
      description="هذه لوحتك الآمنة في بوابة مدارس وروضة المنال. يظهر لك هنا دورك، صلاحياتك الفعّالة وجلسات الدخول النشطة."
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<ShieldCheck className="size-5" />}
          label="دورك الأساسي"
          value={primaryRole ? ROLE_LABELS[primaryRole] : "—"}
        />
        <StatCard
          icon={<Sparkles className="size-5" />}
          label="الصلاحيات الفعّالة"
          value={loadingContext ? "…" : String(permissions.length)}
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label="آخر تسجيل دخول"
          value={formatDate(profile?.lastLoginAt ?? null)}
        />
      </div>

      {primaryRole && (
        <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
          <h2 className="text-lg font-extrabold text-foreground">نطاق عملك</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {ROLE_DESCRIPTIONS[primaryRole]}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground"
                dir="ltr"
              >
                {permission}
              </span>
            ))}
          </div>
          {roles.length > 1 && (
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              لديك أكثر من دور: {roles.map((r) => ROLE_LABELS[r]).join(" • ")}
            </p>
          )}
        </section>
      )}

      <SessionsCard />
    </PortalLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft">
      <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-4 text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function SessionsCard() {
  const { sessionsList } = useSessions();

  return (
    <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
      <h2 className="text-lg font-extrabold text-foreground">الجلسات النشطة</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        الأجهزة التي سجّلت الدخول منها مؤخرًا. يمكنك إنهاء الجلسات الأخرى من صفحة ملفي الشخصي.
      </p>
      <ul className="mt-5 space-y-3">
        {sessionsList.length === 0 && (
          <li className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            لا توجد جلسات مسجّلة بعد.
          </li>
        )}
        {sessionsList.map((session) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-sky/50 text-foreground">
                <Monitor className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {session.device ?? "جهاز غير معروف"} • {session.browser ?? "متصفح"}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {session.ipAddress ?? "—"}
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {formatDate(session.lastSeenAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useSessions() {
  const { sessions } = useAuthSessions();
  return { sessionsList: sessions };
}

function useAuthSessions() {
  const auth = useAuth();
  return { sessions: auth.profile ? authSessions(auth) : [] };
}

function authSessions(auth: ReturnType<typeof useAuth>) {
  return auth.session ? auth.sessionRecords : [];
}