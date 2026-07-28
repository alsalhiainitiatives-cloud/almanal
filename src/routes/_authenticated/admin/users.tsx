import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { PortalLayout } from "@/features/auth/components/PortalLayout";
import {
  adminListUsers,
  adminSetRolePermission,
  adminSetUserRoles,
  getRolePermissionMatrix,
} from "@/features/auth/admin.functions";
import {
  ALL_ROLES,
  P,
  PERMISSION_CATEGORY_LABELS,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type AppRole,
} from "@/features/auth/rbac";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون والأدوار | بوابة المنال" },
      {
        name: "description",
        content: "إدارة مستخدمي بوابة مدارس وروضة المنال وتوزيع الأدوار والصلاحيات بشكل آمن.",
      },
      { property: "og:title", content: "المستخدمون والأدوار | بوابة المنال" },
      { property: "og:description", content: "إدارة الأدوار والصلاحيات في بوابة المنال." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

type AdminUser = Awaited<ReturnType<typeof adminListUsers>>[number];

function AdminUsersPage() {
  const { hasPermission, loadingContext } = useAuth();
  const canManageRoles = hasPermission(P.rolesManage);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminListUsers(),
    enabled: hasPermission(P.usersView),
  });

  if (!loadingContext && !hasPermission(P.usersView)) {
    return <NoAccess />;
  }

  return (
    <PortalLayout
      title="المستخدمون والأدوار"
      description="اعرض حسابات البوابة ووزّع الأدوار. كل تغيير يُسجَّل في سجل العمليات مع الجهاز وعنوان الإنترنت."
    >
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارِ تحميل المستخدمين…
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm font-semibold text-destructive">
            تعذّر تحميل المستخدمين — تأكد من أن حسابك يمتلك صلاحية إدارة المستخدمين.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-start">المستخدم</th>
                  <th className="px-5 py-3 text-start">الأدوار</th>
                  <th className="px-5 py-3 text-start">آخر دخول</th>
                  <th className="px-5 py-3 text-start" />
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((user) => (
                  <tr key={user.id} className="border-t border-border/60">
                    <td className="px-5 py-4">
                      <p className="font-bold text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {user.email ?? user.phone ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">بدون دور</span>
                        )}
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_COLORS[role]}`}
                          >
                            {ROLE_LABELS[role]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                      {user.lastLoginAt
                        ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
                            new Date(user.lastLoginAt),
                          )
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canManageRoles}
                        onClick={() => setEditing(user)}
                        className="rounded-xl font-bold"
                      >
                        <UserCog className="size-4" />
                        الأدوار
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RoleDialog user={editing} onClose={() => setEditing(null)} />

      <PermissionMatrix canManage={hasPermission(P.permissionsManage) || canManageRoles} />
    </PortalLayout>
  );
}

function PermissionMatrix({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => getRolePermissionMatrix(),
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

  const permissions = data?.permissions ?? [];
  const granted = new Set((data?.rolePermissions ?? []).map((r) => `${r.role}:${r.key}`));

  const groups = permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
    const category = permission.category ?? "general";
    (acc[category] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-6 py-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <ShieldCheck className="size-5 text-primary" />
            مصفوفة الأدوار والصلاحيات
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            فعّل أو ألغِ الصلاحية لكل دور بالضغط على المربّع — التغيير يُطبَّق فورًا على كل
            المستخدمين المرتبطين بالدور ويُسجَّل في سجل العمليات.
          </p>
        </div>
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
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${ROLE_COLORS[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([category, items]) => (
                <>
                  <tr key={`cat-${category}`} className="border-t border-border/60 bg-accent/30">
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
                        const checked = granted.has(id);
                        return (
                          <td key={id} className="px-3 py-3 text-center">
                            <Checkbox
                              checked={checked}
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
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RoleDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AppRole[]>([]);
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  if (user && initializedFor !== user.id) {
    setInitializedFor(user.id);
    setSelected(user.roles);
  }

  const mutation = useMutation({
    mutationFn: (roles: AppRole[]) =>
      adminSetUserRoles({ data: { userId: user!.id, roles } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("تم تحديث الأدوار");
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الأدوار."),
  });

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[2rem] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start text-lg font-extrabold">
            أدوار {user?.fullName}
          </DialogTitle>
          <DialogDescription className="text-start text-sm">
            اختر الأدوار المناسبة. الصلاحيات تُستمد من الأدوار وتُطبّق على قاعدة البيانات مباشرة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {ALL_ROLES.map((role) => {
            const checked = selected.includes(role);
            return (
              <label
                key={role}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  checked ? "border-primary/50 bg-primary/5" : "border-border/60 hover:bg-accent/50"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) =>
                    setSelected((prev) =>
                      value === true ? [...prev, role] : prev.filter((r) => r !== role),
                    )
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-bold text-foreground">
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <Button
          onClick={() => mutation.mutate(selected)}
          disabled={mutation.isPending || selected.length === 0}
          className="w-full rounded-2xl py-3 font-bold"
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          حفظ الأدوار
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function NoAccess() {
  return (
    <PortalLayout title="لا توجد صلاحية" description="حسابك لا يملك صلاحية الوصول إلى هذه الصفحة.">
      <div className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <p className="mt-3 text-base font-bold text-foreground">وصول غير مصرّح</p>
        <p className="mt-2 text-sm text-muted-foreground">
          إذا كنت تحتاج هذه الصلاحية، تواصل مع مدير النظام.
        </p>
      </div>
    </PortalLayout>
  );
}