import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, KeyRound, Loader2, ShieldAlert, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
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

import {
  adminBulkSetUserPermissions,
  adminListUsers,
  adminListUserPermissionOverrides,
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


type AdminUser = Awaited<ReturnType<typeof adminListUsers>>[number];

export function UsersBoard() {
  const { hasPermission, loadingContext } = useAuth();
  const canManageRoles = hasPermission(P.rolesManage);
  const canManagePermissions = hasPermission(P.permissionsManage) || canManageRoles;
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminListUsers(),
    enabled: hasPermission(P.usersView),
  });

  const { data: overrides } = useQuery({
    queryKey: ["admin", "user-permission-overrides"],
    queryFn: () => adminListUserPermissionOverrides(),
    enabled: canManagePermissions,
  });

  const overrideCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of overrides ?? []) map.set(row.userId, (map.get(row.userId) ?? 0) + 1);
    return map;
  }, [overrides]);

  const users = data ?? [];
  const allSelected = users.length > 0 && selected.length === users.length;

  if (!loadingContext && !hasPermission(P.usersView)) {
    return <NoAccess />;
  }

  return (
    <div className="space-y-5">
      {canManagePermissions && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border/60 bg-card/80 px-5 py-4 shadow-soft">
          <p className="text-sm font-bold text-foreground">
            {selected.length > 0
              ? `تم اختيار ${selected.length} مستخدم`
              : "اختر مستخدمين لتنفيذ إجراء جماعي على الصلاحيات"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl font-bold"
              disabled={selected.length === 0}
              onClick={() => setSelected([])}
            >
              إلغاء التحديد
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold"
              disabled={selected.length === 0}
              onClick={() => setBulkOpen(true)}
            >
              <KeyRound className="size-4" />
              إجراء جماعي على الصلاحيات
            </Button>
          </div>
        </div>
      )}

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
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-start">
                    {canManagePermissions && (
                      <Checkbox
                        checked={allSelected}
                        aria-label="تحديد الكل"
                        onCheckedChange={(value) =>
                          setSelected(value === true ? users.map((u) => u.id) : [])
                        }
                      />
                    )}
                  </th>
                  <th className="px-5 py-3 text-start">المستخدم</th>
                  <th className="px-5 py-3 text-start">الأدوار</th>
                  <th className="px-5 py-3 text-start">استثناءات</th>
                  <th className="px-5 py-3 text-start">آخر دخول</th>
                  <th className="px-5 py-3 text-start" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const checked = selected.includes(user.id);
                  return (
                    <tr key={user.id} className="border-t border-border/60">
                      <td className="px-4 py-4">
                        {canManagePermissions && (
                          <Checkbox
                            checked={checked}
                            aria-label={`تحديد ${user.fullName}`}
                            onCheckedChange={(value) =>
                              setSelected((prev) =>
                                value === true
                                  ? [...prev, user.id]
                                  : prev.filter((id) => id !== user.id),
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={user.fullName} src={user.avatarUrl} className="size-9" />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">
                              {user.email ?? user.phone ?? "—"}
                            </p>
                          </div>
                        </div>
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
                      <td className="px-5 py-4 text-xs font-bold text-muted-foreground">
                        {overrideCount.get(user.id)
                          ? `${overrideCount.get(user.id)} استثناء`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                        {user.lastLoginAt
                          ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
                              new Date(user.lastLoginAt),
                            )
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          {user.roles.includes("teacher") && (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-bold"
                            >
                              <Link
                                to="/admin/teachers/$teacherId"
                                params={{ teacherId: user.id }}
                              >
                                <GraduationCap className="size-4" />
                                تفاصيل المعلمة
                              </Link>
                            </Button>
                          )}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RoleDialog user={editing} onClose={() => setEditing(null)} />
      <BulkPermissionDialog
        open={bulkOpen}
        userIds={selected}
        onClose={() => setBulkOpen(false)}
        onDone={() => {
          setBulkOpen(false);
          setSelected([]);
        }}
      />
    </div>
  );
}

function BulkPermissionDialog({
  open,
  userIds,
  onClose,
  onDone,
}: {
  open: boolean;
  userIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [keys, setKeys] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => getRolePermissionMatrix(),
    enabled: open,
  });

  const permissions = data?.permissions ?? [];
  const groups = permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
    const category = permission.category ?? "general";
    (acc[category] ??= []).push(permission);
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: (action: "grant" | "revoke" | "reset") =>
      adminBulkSetUserPermissions({ data: { userIds, permissionKeys: keys, action } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-permission-overrides"] });
      toast.success(`تم تطبيق الإجراء على ${result.affected} سجل صلاحية`);
      setKeys([]);
      onDone();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تنفيذ الإجراء الجماعي."),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[2rem] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-start text-lg font-extrabold">
            إجراء جماعي على الصلاحيات
          </DialogTitle>
          <DialogDescription className="text-start text-sm">
            اختر الصلاحيات ثم امنحها أو اسحبها من {userIds.length} مستخدم دفعة واحدة. المنح والسحب
            استثناء شخصي يتجاوز صلاحيات الدور، و«إرجاع للدور» يحذف الاستثناء.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارِ التحميل…
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([category, items]) => (
              <div key={category} className="rounded-2xl border border-border/60 p-4">
                <p className="text-xs font-extrabold text-foreground">
                  {PERMISSION_CATEGORY_LABELS[category] ?? category}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {items.map((permission) => {
                    const checked = keys.includes(permission.key);
                    return (
                      <label
                        key={permission.key}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-start transition-colors ${
                          checked
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/60 hover:bg-accent/50"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setKeys((prev) =>
                              value === true
                                ? [...prev, permission.key]
                                : prev.filter((k) => k !== permission.key),
                            )
                          }
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block text-xs font-bold text-foreground">
                            {permission.description_ar}
                          </span>
                          <span className="block text-[10px] text-muted-foreground" dir="ltr">
                            {permission.key}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            className="flex-1 rounded-2xl font-bold"
            disabled={mutation.isPending || keys.length === 0}
            onClick={() => mutation.mutate("grant")}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            منح الصلاحيات
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-2xl font-bold"
            disabled={mutation.isPending || keys.length === 0}
            onClick={() => mutation.mutate("revoke")}
          >
            سحب الصلاحيات
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-2xl font-bold"
            disabled={mutation.isPending || keys.length === 0}
            onClick={() => mutation.mutate("reset")}
          >
            إرجاع للدور
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
    mutationFn: (roles: AppRole[]) => adminSetUserRoles({ data: { userId: user!.id, roles } }),
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
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <p className="mt-3 text-base font-bold text-foreground">وصول غير مصرّح</p>
        <p className="mt-2 text-sm text-muted-foreground">
          إذا كنت تحتاج هذه الصلاحية، تواصل مع مدير النظام.
        </p>
      </div>
    </div>
  );
}
