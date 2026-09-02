import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useAuth } from "@/features/auth/AuthProvider";

import { adminListAuditLogs, getRolePermissionMatrix } from "@/features/auth/admin.functions";
import {
  ALL_ROLES,
  P,
  PERMISSION_CATEGORY_LABELS,
  ROLE_LABELS,
} from "@/features/auth/rbac";
import { NoAccess } from "./UsersBoard";


export function AuditBoard() {
  const { hasPermission, loadingContext } = useAuth();
  const canView = hasPermission(P.auditView);

  const logs = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => adminListAuditLogs(),
    enabled: canView,
  });

  const matrix = useQuery({
    queryKey: ["admin", "matrix"],
    queryFn: () => getRolePermissionMatrix(),
    enabled: canView,
  });

  if (!loadingContext && !canView) return <NoAccess />;

  const grouped = (matrix.data?.permissions ?? []).reduce<
    Record<string, { key: string; description_ar: string | null }[]>
  >((acc, permission) => {
    const category = permission.category ?? "general";
    acc[category] = acc[category] ?? [];
    acc[category].push({ key: permission.key, description_ar: permission.description_ar });
    return acc;
  }, {});

  const hasRolePermission = (role: string, key: string) =>
    (matrix.data?.rolePermissions ?? []).some((rp) => rp.role === role && rp.key === key);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft">
        <h2 className="border-b border-border/60 px-6 py-4 text-lg font-extrabold text-foreground">
          أحدث 100 عملية
        </h2>
        {logs.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارِ تحميل السجل…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start">العملية</th>
                  <th className="px-5 py-3 text-start">المنفّذ</th>
                  <th className="px-5 py-3 text-start">الجهاز</th>
                  <th className="px-5 py-3 text-start">التاريخ</th>
                  <th className="px-5 py-3 text-start">النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-5 py-3 font-bold text-foreground" dir="ltr">
                      {row.action}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground" dir="ltr">
                      {row.actor_email ?? row.user_id ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {row.device ?? "—"} • {row.browser ?? "—"}
                      <span className="block" dir="ltr">
                        {row.ip_address ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("ar-SA", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(row.created_at))}
                    </td>
                    <td className="px-5 py-3">
                      {row.success ? (
                        <CheckCircle2 className="size-4 text-primary" />
                      ) : (
                        <XCircle className="size-4 text-destructive" />
                      )}
                    </td>
                  </tr>
                ))}
                {(logs.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      لا توجد عمليات مسجّلة بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-soft sm:p-8">
        <h2 className="text-lg font-extrabold text-foreground">مصفوفة الأدوار والصلاحيات</h2>
        <div className="mt-5 space-y-7">
          {Object.entries(grouped).map(([category, permissions]) => (
            <div key={category}>
              <h3 className="text-sm font-extrabold text-primary">
                {PERMISSION_CATEGORY_LABELS[category] ?? category}
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] text-xs">
                  <thead className="bg-muted/60 font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-start">الصلاحية</th>
                      {ALL_ROLES.map((role) => (
                        <th key={role} className="px-2 py-2 text-center">
                          {ROLE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.key} className="border-t border-border/60">
                        <td className="px-4 py-2">
                          <span className="font-bold text-foreground">
                            {permission.description_ar ?? permission.key}
                          </span>
                        </td>
                        {ALL_ROLES.map((role) => (
                          <td key={role} className="px-2 py-2 text-center">
                            {hasRolePermission(role, permission.key) ? (
                              <CheckCircle2 className="mx-auto size-4 text-primary" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
