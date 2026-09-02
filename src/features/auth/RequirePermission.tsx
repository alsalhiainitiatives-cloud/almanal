/**
 * Declarative guard for UI elements: renders children only when the signed-in
 * user holds the given permission code(s).
 *
 *   <RequirePermission code="study_plan.update"><Button/></RequirePermission>
 *   <RequirePermission anyOf={["inbox.reply", "inbox.status"]}>…</RequirePermission>
 */
import type { ReactNode } from "react";

import { usePermissions } from "./usePermissions";

type Props = {
  code?: string;
  anyOf?: string[];
  allOf?: string[];
  /** Render while the permission context is still loading. */
  loadingFallback?: ReactNode;
  /** Render when the user lacks the permission. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
};

export function RequirePermission({
  code,
  anyOf,
  allOf,
  loadingFallback = null,
  fallback = null,
  children,
}: Props) {
  const { can, canAny, canAll, loading } = usePermissions();

  if (loading) return <>{loadingFallback}</>;

  const checks: boolean[] = [];
  if (code) checks.push(can(code));
  if (anyOf?.length) checks.push(canAny(anyOf));
  if (allOf?.length) checks.push(canAll(allOf));

  const allowed = checks.length === 0 ? true : checks.every(Boolean);
  return <>{allowed ? children : fallback}</>;
}
