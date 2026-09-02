/**
 * Hierarchical, dynamic permissions matrix.
 *
 * Modules → sub-modules → actions are rendered from the merged registry
 * (`permissionsConfig.ts` + `public.permissions`), so new features appear here
 * automatically without UI changes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, ShieldCheck, Square, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/features/auth/AuthProvider";

import {
  adminBulkSetRolePermissions,
  adminSetRolePermission,
  getRolePermissionMatrix,
} from "@/features/auth/admin.functions";
import {
  actionLabel,
  buildPermissionTree,
  type MatrixModule,
} from "@/features/auth/permissionsConfig";
import { ALL_ROLES, P, ROLE_COLORS, ROLE_LABELS, type AppRole } from "@/features/auth/rbac";
import { NoAccess } from "./UsersBoard";

export function PermissionsBoard() {
  const { hasPermission, loadingContext } = useAuth();
  const canManage = hasPermission(P.permissionsManage) || hasPermission(P.rolesManage);
  const queryClient = useQueryClient();
  const [activeRole, setActiveRole] = useState<AppRole>("registration_officer");
  const [pending, setPending] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => getRolePermissionMatrix(),
    enabled: hasPermission(P.usersView),
  });

  const tree: MatrixModule[] = useMemo(
    () => buildPermissionTree(data?.permissions ?? []),
    [data?.permissions],
  );

  const grantedByRole = useMemo(() => {
    const map = new Map<AppRole, Set<string>>();
    for (const row of data?.rolePermissions ?? []) {
      const set = map.get(row.role) ?? new Set<string>();
      set.add(row.key);
      map.set(row.role, set);
    }
    return map;
  }, [data?.rolePermissions]);

  const granted = grantedByRole.get(activeRole) ?? new Set<string>();
  const allCodes = useMemo(() => tree.flatMap((m) => m.codes), [tree]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "permission-matrix"] });

  const single = useMutation({
    mutationFn: (input: { role: AppRole; permissionKey: string; granted: boolean }) =>
      adminSetRolePermission({ data: input }),
    onSuccess: async (_r, input) => {
      await invalidate();
      toast.success(input.granted ? "تم منح الصلاحية" : "تم سحب الصلاحية");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الصلاحية."),
    onSettled: () => setPending(null),
  });

  const bulk = useMutation({
    mutationFn: (input: { role: AppRole; permissionKeys: string[]; granted: boolean }) =>
      adminBulkSetRolePermissions({ data: input }),
    onSuccess: async (_r, input) => {
      await invalidate();
      toast.success(
        input.granted
          ? `تم منح ${input.permissionKeys.length} صلاحية`
          : `تم سحب ${input.permissionKeys.length} صلاحية`,
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "تعذّر تحديث الصلاحيات."),
    onSettled: () => setPending(null),
  });

  const applyBulk = (codes: string[], nextGranted: boolean, token: string) => {
    const targets = nextGranted
      ? codes.filter((code) => !granted.has(code))
      : codes.filter((code) => granted.has(code));
    if (!targets.length) {
      toast.info(nextGranted ? "كل الصلاحيات ممنوحة بالفعل" : "لا توجد صلاحيات لسحبها");
      return;
    }
    setPending(token);
    bulk.mutate({ role: activeRole, permissionKeys: targets, granted: nextGranted });
  };

  if (!loadingContext && !hasPermission(P.usersView)) {
    return <NoAccess />;
  }

  const busy = bulk.isPending || single.isPending;

  return (
    <div className="space-y-5">
      {/* Sticky global controls */}
      <div className="sticky top-2 z-20 space-y-4 rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <ShieldCheck className="size-5 text-primary" />
            مصفوفة الصلاحيات الهرمية
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
              {granted.size} / {allCodes.length} صلاحية ممنوحة
            </span>
            {!canManage && (
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
                عرض فقط
              </span>
            )}
          </div>
        </div>

        {/* Role picker — explicit cards so the active role is unmistakable */}
        <div className="space-y-3">
          <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <UserCog className="size-4" /> اختر الدور الذي تريد تعديل صلاحياته:
          </span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_ROLES.map((role) => {
              const active = activeRole === role;
              const count = (grantedByRole.get(role) ?? new Set<string>()).size;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRole(role)}
                  aria-pressed={active}
                  className={`flex items-start gap-2 rounded-2xl border p-3 text-start transition ${
                    active
                      ? "border-primary bg-primary/10 shadow-soft ring-2 ring-primary/40"
                      : "border-border/60 bg-card hover:bg-accent/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-extrabold text-foreground">
                        {ROLE_LABELS[role]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[role]}`}
                      >
                        {count} صلاحية
                      </span>
                    </span>
                    <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
            <UserCog className="size-4 text-primary" />
            <p className="text-xs font-bold text-foreground">
              أنت الآن تعدّل صلاحيات دور:{" "}
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${ROLE_COLORS[activeRole]}`}
              >
                {ROLE_LABELS[activeRole]}
              </span>{" "}
              — أي تعديل هنا يطبَّق على جميع المستخدمين الذين يحملون هذا الدور.
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              className="bg-mint text-foreground hover:bg-mint/80"
              onClick={() => applyBulk(allCodes, true, "global:all")}
            >
              {pending === "global:all" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              تحديد كل الصلاحيات
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => applyBulk(allCodes, false, "global:none")}
            >
              {pending === "global:none" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Square className="size-4" />
              )}
              إلغاء تحديد الكل
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-[2rem] border border-border/60 bg-card p-10 text-sm font-semibold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جارِ تحميل المصفوفة…
        </div>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={tree.slice(0, 2).map((m) => m.module)}
          className="space-y-3"
        >
          {tree.map((module) => {
            const moduleGranted = module.codes.filter((code) => granted.has(code)).length;
            return (
              <AccordionItem
                key={module.module}
                value={module.module}
                className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-soft"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="flex flex-1 flex-wrap items-center justify-between gap-3 pe-3">
                    <span className="text-sm font-extrabold text-foreground">{module.label}</span>
                    <span className="rounded-full bg-accent/50 px-3 py-1 text-[11px] font-bold text-foreground">
                      {moduleGranted} / {module.codes.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 border-t border-border/60 bg-muted/20 px-5 py-5">
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => applyBulk(module.codes, true, `m:${module.module}:all`)}
                      >
                        تحديد كل «{module.label}»
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={busy}
                        onClick={() => applyBulk(module.codes, false, `m:${module.module}:none`)}
                      >
                        إلغاء تحديد «{module.label}»
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    {module.subModules.map((sub) => {
                      const codes = sub.permissions.map((p) => p.code);
                      const subGranted = codes.filter((code) => granted.has(code)).length;
                      return (
                        <section
                          key={`${module.module}:${sub.subModule}`}
                          className="rounded-[1.5rem] border border-border/60 bg-card p-4"
                        >
                          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-extrabold text-foreground">{sub.label}</p>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                {subGranted} من {codes.length} صلاحية
                              </p>
                            </div>
                            {canManage && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-full px-2 text-[11px] font-bold text-mint-foreground"
                                  disabled={busy}
                                  onClick={() =>
                                    applyBulk(codes, true, `s:${sub.subModule}:all`)
                                  }
                                >
                                  الكل
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-full px-2 text-[11px] font-bold text-destructive"
                                  disabled={busy}
                                  onClick={() =>
                                    applyBulk(codes, false, `s:${sub.subModule}:none`)
                                  }
                                >
                                  لا شيء
                                </Button>
                              </div>
                            )}
                          </header>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {sub.permissions.map((permission) => {
                              const id = `${activeRole}:${permission.code}`;
                              return (
                                <label
                                  key={permission.code}
                                  className="flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/20 p-3"
                                >
                                  <Checkbox
                                    checked={granted.has(permission.code)}
                                    disabled={!canManage || busy}
                                    aria-label={`${ROLE_LABELS[activeRole]} — ${permission.labelAr}`}
                                    onCheckedChange={(value) => {
                                      setPending(id);
                                      single.mutate({
                                        role: activeRole,
                                        permissionKey: permission.code,
                                        granted: value === true,
                                      });
                                    }}
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-bold text-foreground">
                                      {permission.labelAr}
                                    </span>
                                    <span className="mt-1 flex flex-wrap items-center gap-1">
                                      <span className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px] font-bold text-foreground">
                                        {actionLabel(permission.action)}
                                      </span>
                                      <span
                                        className="text-[10px] text-muted-foreground"
                                        dir="ltr"
                                      >
                                        {permission.code}
                                      </span>
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
