import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/features/auth/AuthProvider";

import { adminSetRolePermission, getRolePermissionMatrix } from "@/features/auth/admin.functions";
import {
  ALL_ROLES,
  P,
  PERMISSION_CATEGORY_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  type AppRole,
} from "@/features/auth/rbac";
import { NoAccess } from "./UsersBoard";


export function PermissionsBoard() {
  const { hasPermission, loadingContext } = useAuth();
  const canManage = hasPermission(P.permissionsManage) || hasPermission(P.rolesManage);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => getRolePermissionMatrix(),
    enabled: hasPermission(P.usersView),
  });

  const mutation = useMutation({
    mutationFn: (input: { role: AppRole; permissionKey: string; granted: boolean }) =>
      adminSetRolePermission({ data: input }),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "permission-matrix"] });
      toast.success(input.granted ? "تم منح الصلاحية" : "تم سحب الصلاحية");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الصلاحية."),
    onSettled: () => setPending(null),
  });

  if (!loadingContext && !hasPermission(P.usersView)) {
    return <NoAccess />;
  }

  const permissions = data?.permissions ?? [];
  const granted = new Set((data?.rolePermissions ?? []).map((r) => `${r.role}:${r.key}`));
  const groups = permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
    const category = permission.category ?? "general";
    (acc[category] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-6 py-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <ShieldCheck className="size-5 text-primary" />
            الصلاحيات حسب الدور
          </h2>
          {!canManage && (
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
              عرض فقط
            </span>
          )}
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارِ تحميل المصفوفة…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-start text-sm">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start">الصلاحية</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="px-3 py-3 text-center">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_COLORS[role]}`}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groups).map(([category, items]) => (
                  <Fragment key={category}>
                    <tr className="border-t border-border/60 bg-accent/30">
                      <td
                        colSpan={ALL_ROLES.length + 1}
                        className="px-5 py-2 text-xs font-extrabold text-foreground"
                      >
                        {PERMISSION_CATEGORY_LABELS[category] ?? category}
                      </td>
                    </tr>
                    {items.map((permission) => (
                      <tr key={permission.key} className="border-t border-border/60">
                        <td className="px-5 py-3">
                          <p className="text-sm font-bold text-foreground">
                            {permission.description_ar}
                          </p>
                          <p className="text-[11px] text-muted-foreground" dir="ltr">
                            {permission.key}
                          </p>
                        </td>
                        {ALL_ROLES.map((role) => {
                          const id = `${role}:${permission.key}`;
                          return (
                            <td key={id} className="px-3 py-3 text-center">
                              <Checkbox
                                checked={granted.has(id)}
                                disabled={!canManage || pending === id}
                                aria-label={`${ROLE_LABELS[role]} — ${permission.description_ar}`}
                                onCheckedChange={(value) => {
                                  setPending(id);
                                  mutation.mutate({
                                    role,
                                    permissionKey: permission.key,
                                    granted: value === true,
                                  });
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
