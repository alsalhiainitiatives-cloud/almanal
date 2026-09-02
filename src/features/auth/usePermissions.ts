/**
 * Frontend guardrails: read the signed-in user's effective permissions
 * (roles + per-user overrides, resolved on the server) and check codes.
 */
import { useMemo } from "react";

import { useAuth } from "./AuthProvider";

export type PermissionsApi = {
  permissions: string[];
  loading: boolean;
  can: (code: string) => boolean;
  canAny: (codes: string[]) => boolean;
  canAll: (codes: string[]) => boolean;
};

export function usePermissions(): PermissionsApi {
  const { permissions, loadingContext, initializing } = useAuth();

  return useMemo(() => {
    const set = new Set(permissions);
    return {
      permissions,
      loading: initializing || loadingContext,
      can: (code: string) => set.has(code),
      canAny: (codes: string[]) => codes.some((code) => set.has(code)),
      canAll: (codes: string[]) => codes.every((code) => set.has(code)),
    };
  }, [initializing, loadingContext, permissions]);
}
