/**
 * Server-only auth/RBAC service layer. Called exclusively from
 * `auth.functions.ts` and `admin.functions.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import type { AppRole } from "./rbac";
import type { ProfileInput, SignInInput } from "./schemas";
import {
  getRequestMeta,
  isRateLimited,
  recordAudit,
  recordLoginAttempt,
  registerSessionRecord,
  resolveEmail,
  serverAuthClient,
} from "./auth.server";

type Db = SupabaseClient<Database>;

export type SecurityContext = {
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    preferredLanguage: string;
    lastLoginAt: string | null;
  } | null;
  roles: AppRole[];
  permissions: string[];
  sessions: Array<{
    id: string;
    device: string | null;
    browser: string | null;
    ipAddress: string | null;
    lastSeenAt: string;
    rememberMe: boolean;
  }>;
};

export async function performSignIn(data: SignInInput) {
  const meta = getRequestMeta();
  const identifier = data.identifier.trim().toLowerCase();

  if (await isRateLimited(identifier, meta.ip)) {
    await recordAudit({
      action: "auth.login.blocked",
      success: false,
      metadata: { identifier },
      meta,
    });
    throw new Error("تم تجاوز عدد المحاولات المسموح. يرجى المحاولة بعد 15 دقيقة.");
  }

  const email = await resolveEmail(identifier);
  if (!email) {
    await recordLoginAttempt({ identifier, success: false, meta });
    throw new Error("بيانات الدخول غير صحيحة.");
  }

  const auth = serverAuthClient();
  const { data: result, error } = await auth.auth.signInWithPassword({
    email,
    password: data.password,
  });

  if (error || !result.session || !result.user) {
    await recordLoginAttempt({ identifier, success: false, meta });
    await recordAudit({
      action: "auth.login",
      actorEmail: email,
      success: false,
      metadata: { reason: error?.message ?? "invalid_credentials" },
      meta,
    });
    throw new Error("بيانات الدخول غير صحيحة.");
  }

  await recordLoginAttempt({ identifier, success: true, meta });
  await registerSessionRecord({
    userId: result.user.id,
    rememberMe: Boolean(data.rememberMe),
    meta,
  });
  await recordAudit({
    userId: result.user.id,
    actorEmail: email,
    action: "auth.login",
    success: true,
    metadata: { rememberMe: Boolean(data.rememberMe) },
    meta,
  });

  return {
    accessToken: result.session.access_token,
    refreshToken: result.session.refresh_token,
  };
}

export async function buildSecurityContext(supabase: Db, userId: string): Promise<SecurityContext> {
  const [{ data: profile }, { data: roleRows }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, preferred_language, last_login_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("user_sessions")
      .select("id, device, browser, ip_address, last_seen_at, remember_me")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false })
      .limit(10),
  ]);

  const roles = (roleRows ?? []).map((r) => r.role as AppRole);

  let permissions: string[] = [];
  if (roles.length) {
    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("permission_key")
      .in("role", roles);
    permissions = [...new Set((permRows ?? []).map((p) => p.permission_key))];
  }

  return {
    profile: profile
      ? {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          avatarUrl: profile.avatar_url,
          preferredLanguage: profile.preferred_language,
          lastLoginAt: profile.last_login_at,
        }
      : null,
    roles,
    permissions,
    sessions: (sessionRows ?? []).map((s) => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      ipAddress: s.ip_address,
      lastSeenAt: s.last_seen_at,
      rememberMe: s.remember_me,
    })),
  };
}

export async function saveProfile(supabase: Db, userId: string, data: ProfileInput) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      phone: data.phone || null,
      preferred_language: data.preferredLanguage,
      avatar_url: data.avatarUrl || null,
    })
    .eq("id", userId);

  if (error) throw new Error("تعذّر حفظ البيانات، يرجى المحاولة لاحقًا.");

  await recordAudit({
    userId,
    action: "profile.update",
    entity: "profiles",
    entityId: userId,
    meta: getRequestMeta(),
  });
  return { ok: true as const };
}

export async function revokeOtherSessionRecords(userId: string) {
  const meta = getRequestMeta();
  const now = new Date().toISOString();

  const { data: sessions } = await supabaseAdmin
    .from("user_sessions")
    .select("id, user_agent, ip_address")
    .eq("user_id", userId)
    .is("revoked_at", null);

  const otherIds = (sessions ?? [])
    .filter((s) => s.user_agent !== meta.userAgent || s.ip_address !== meta.ip)
    .map((s) => s.id);

  if (otherIds.length) {
    await supabaseAdmin
      .from("user_sessions")
      .update({ revoked_at: now })
      .in("id", otherIds);
  }

  await recordAudit({ userId, action: "auth.sessions.revoke_others", meta });
  return { ok: true as const };
}

export async function writeSecurityEvent(userId: string, action: string) {
  await recordAudit({ userId, action, meta: getRequestMeta() });
  return { ok: true as const };
}

/** Admin-only: users with their roles. Requires the caller to be an admin. */
export async function assertAdmin(supabase: Db, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("غير مصرح: هذه العملية لمدير النظام فقط.");
}

export async function listUsersWithRoles(supabase: Db) {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, last_login_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  return (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    lastLoginAt: p.last_login_at,
    createdAt: p.created_at,
    roles: (roles ?? [])
      .filter((r) => r.user_id === p.id)
      .map((r) => r.role as AppRole),
  }));
}

export async function replaceUserRoles(actorId: string, userId: string, roles: AppRole[]) {
  const meta = getRequestMeta();

  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (roles.length) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert(roles.map((role) => ({ user_id: userId, role })));
    if (error) throw new Error("تعذّر تحديث الأدوار.");
  }

  await recordAudit({
    userId: actorId,
    action: "roles.assign",
    entity: "user_roles",
    entityId: userId,
    metadata: { roles },
    meta,
  });
  return { ok: true as const };
}

export async function listAuditEntries(supabase: Db, limit: number) {
  const { data } = await supabase
    .from("audit_logs")
    .select("id, user_id, actor_email, action, entity, entity_id, ip_address, browser, device, success, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listRolePermissionMatrix(supabase: Db) {
  const [{ data: permissions }, { data: rolePermissions }] = await Promise.all([
    supabase.from("permissions").select("key, description_ar, category").order("category"),
    supabase.from("role_permissions").select("role, permission_key"),
  ]);
  return {
    permissions: permissions ?? [],
    rolePermissions: (rolePermissions ?? []).map((r) => ({
      role: r.role as AppRole,
      key: r.permission_key,
    })),
  };
}