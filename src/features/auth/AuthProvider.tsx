/**
 * Single source of truth for the browser-side auth session and the caller's
 * effective RBAC context (roles + permissions), loaded from the server.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { getSecurityContext, logSecurityEvent } from "./auth.functions";
import { READ_ONLY_ROLES, type AppRole } from "./rbac";

type SecurityContextData = Awaited<ReturnType<typeof getSecurityContext>>;

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  initializing: boolean;
  loadingContext: boolean;
  profile: SecurityContextData["profile"] | null;
  roles: AppRole[];
  permissions: string[];
  primaryRole: AppRole | null;
  isReadOnly: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "principal",
  "supervisor",
  "registration_officer",
  "accountant",
  "parent",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  const userId = session?.user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["security-context", userId],
    queryFn: () => getSecurityContext(),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["security-context"] });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await logSecurityEvent({ data: "auth.logout" });
    } catch {
      // audit failures must never block sign-out
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const roles = (data?.roles ?? []) as AppRole[];
    const permissions = data?.permissions ?? [];
    const primaryRole = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;

    return {
      user: session?.user ?? null,
      session,
      isAuthenticated: Boolean(session?.user),
      initializing,
      loadingContext: isLoading,
      profile: data?.profile ?? null,
      roles,
      permissions,
      primaryRole,
      isReadOnly: roles.length > 0 && roles.every((r) => READ_ONLY_ROLES.includes(r)),
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (list) => list.some((role) => roles.includes(role)),
      hasPermission: (permission) => permissions.includes(permission),
      hasAnyPermission: (list) => list.some((permission) => permissions.includes(permission)),
      refresh,
      signOut,
    };
  }, [data, initializing, isLoading, refresh, session, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}