/**
 * Role visibility screen: for every role, which module tabs appear and which
 * inner pages open — resolved from the same maps that drive the navigation,
 * so it always matches what the user actually sees.
 */
import { useQuery } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, Map as MapIcon, UserCog } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { getRolePermissionMatrix } from "@/features/auth/admin.functions";
import { resolveAccess } from "@/features/ams/access-map";
import {
  ALL_ROLES,
  P,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type AppRole,
} from "@/features/auth/rbac";
import { NoAccess } from "./UsersBoard";

export function RoleAccessMap() {
  const { hasPermission, loadingContext } = useAuth();
  const [activeRole, setActiveRole] = useState<AppRole>("teacher");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => getRolePermissionMatrix(),
    enabled: hasPermission(P.usersView),
  });

  const permissionsByRole = useMemo(() => {
    const map = new Map<AppRole, string[]>();
    for (const row of data?.rolePermissions ?? []) {
      map.set(row.role, [...(map.get(row.role) ?? []), row.key]);
    }
    return map;
  }, [data?.rolePermissions]);

  const rolePermissions = permissionsByRole.get(activeRole) ?? [];
  const modules = useMemo(() => resolveAccess(activeRole, rolePermissions), [activeRole, rolePermissions]);
  const visibleModules = modules.filter((m) => m.moduleVisible).length;

  if (!loadingContext && !hasPermission(P.usersView)) return <NoAccess />;

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-border/60 bg-card/95 p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
            <MapIcon className="size-5 text-primary" />
            خريطة ظهور التبويبات لكل دور
          </h2>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">
            {visibleModules} / {modules.length} تبويب رئيسي ظاهر
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          يظهر التبويب الرئيسي عند امتلاك الدور أي صلاحية داخله، وتُفلتر الصفحات الفرعية بحسب
          صلاحياتها. لتعديل الظهور، امنح أو اسحب الصلاحية من مصفوفة الصلاحيات.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_ROLES.map((role) => {
            const active = activeRole === role;
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
                      {(permissionsByRole.get(role) ?? []).length} صلاحية
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

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <UserCog className="size-4 text-primary" />
          <p className="text-xs font-bold text-foreground">
            تستعرض الآن ما يظهر لدور:{" "}
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${ROLE_COLORS[activeRole]}`}
            >
              {ROLE_LABELS[activeRole]}
            </span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid place-items-center rounded-[2rem] border border-border/60 bg-card p-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.to}
              className={`rounded-[2rem] border p-5 shadow-sm ${
                module.moduleVisible
                  ? "border-primary/30 bg-card"
                  : "border-dashed border-border/70 bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-foreground">{module.label}</h3>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                    module.moduleVisible
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {module.moduleVisible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  {module.moduleVisible ? "ظاهر" : "مخفي"}
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {module.links.map((link) => (
                  <li
                    key={link.to}
                    className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 text-[11px] ${
                      module.moduleVisible && link.visible
                        ? "bg-accent/40 text-foreground"
                        : "bg-muted/50 text-muted-foreground line-through"
                    }`}
                  >
                    <span className="font-bold">{link.label}</span>
                    <span className="shrink-0 font-semibold" dir="ltr">
                      {module.superRole || link.required.length === 0
                        ? "—"
                        : link.required.join(" | ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
