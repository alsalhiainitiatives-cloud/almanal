/**
 * Server-only auth helpers: request forensics, brute-force protection,
 * audit logging, identifier resolution and session bookkeeping.
 *
 * Never import this file from client code (`*.server.ts` is blocked from the
 * browser bundle). Server functions in `auth.functions.ts` are the entry points.
 */
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export const MAX_FAILED_ATTEMPTS = 6;
export const LOCKOUT_WINDOW_MINUTES = 15;

export type RequestMeta = {
  ip: string | null;
  userAgent: string | null;
  browser: string;
  device: string;
};

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "متصفح غير معروف";
}

function parseDevice(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return "جهاز لوحي";
  if (/Mobi|iPhone|Android/i.test(ua)) return "جهاز جوال";
  if (/Mac OS X/.test(ua)) return "حاسب Mac";
  if (/Windows/.test(ua)) return "حاسب Windows";
  if (/Linux/.test(ua)) return "حاسب Linux";
  return "جهاز غير معروف";
}

export function getRequestMeta(): RequestMeta {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const headers = getRequest()?.headers;
    ip =
      headers?.get("cf-connecting-ip") ??
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers?.get("x-real-ip") ??
      null;
    userAgent = headers?.get("user-agent") ?? null;
  } catch {
    // no request context (e.g. prerender)
  }
  const ua = userAgent ?? "";
  return { ip, userAgent, browser: parseBrowser(ua), device: parseDevice(ua) };
}

/** Normalizes Saudi mobile numbers to their last 9 significant digits. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

export function isEmail(value: string): boolean {
  return value.includes("@");
}

export async function recordLoginAttempt(input: {
  identifier: string;
  success: boolean;
  meta: RequestMeta;
}) {
  try {
    await supabaseAdmin.from("login_attempts").insert({
      identifier: input.identifier.slice(0, 160).toLowerCase(),
      ip_address: input.meta.ip,
      user_agent: input.meta.userAgent,
      success: input.success,
    });
  } catch (error) {
    // Telemetry must never block authentication.
    console.error("[auth] failed to record login attempt", error);
  }
}

export async function recordAudit(input: {
  userId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
  meta: RequestMeta;
}) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
    user_id: input.userId ?? null,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    success: input.success ?? true,
    metadata: (input.metadata ?? {}) as never,
    ip_address: input.meta.ip,
    user_agent: input.meta.userAgent,
    browser: input.meta.browser,
    device: input.meta.device,
    });
  } catch (error) {
    console.error("[auth] failed to write audit log", error);
  }
}

/** Brute-force protection: too many recent failures for the identifier or IP. */
export async function isRateLimited(identifier: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60_000).toISOString();
  try {
    const byIdentifier = await supabaseAdmin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier.toLowerCase())
    .eq("success", false)
    .gte("created_at", since);

    if ((byIdentifier.count ?? 0) >= MAX_FAILED_ATTEMPTS) return true;

    if (ip) {
      const byIp = await supabaseAdmin
        .from("login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("success", false)
        .gte("created_at", since);
      if ((byIp.count ?? 0) >= MAX_FAILED_ATTEMPTS * 4) return true;
    }
  } catch (error) {
    // Fail open on telemetry outages rather than locking every family out.
    console.error("[auth] rate limit check failed", error);
  }
  return false;
}

/**
 * Resolves the sign-in email for an identifier that may be an email or a mobile
 * number. Resolution happens entirely server-side so mobile numbers can never be
 * used to enumerate the email addresses of other families.
 */
export async function resolveEmail(identifier: string): Promise<string | null> {
  const value = identifier.trim();
  if (isEmail(value)) return value.toLowerCase();

  const phone = normalizePhone(value);
  if (!phone) return null;

  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("email, phone")
      .ilike("phone", `%${phone}`)
      .limit(2);

    if (!data || data.length !== 1) return null;
    return data[0].email ?? null;
  } catch (error) {
    console.error("[auth] phone resolution failed", error);
    return null;
  }
}

/** Publishable-key client used for server-side credential verification. */
export function serverAuthClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export async function registerSessionRecord(input: {
  userId: string;
  rememberMe: boolean;
  meta: RequestMeta;
}) {
  const now = new Date().toISOString();
  try {
    const existing = await supabaseAdmin
    .from("user_sessions")
    .select("id")
    .eq("user_id", input.userId)
    .is("revoked_at", null)
    .eq("user_agent", input.meta.userAgent ?? "")
    .eq("ip_address", input.meta.ip ?? "")
    .maybeSingle();

    if (existing.data?.id) {
      await supabaseAdmin
        .from("user_sessions")
        .update({ last_seen_at: now, remember_me: input.rememberMe })
        .eq("id", existing.data.id);
    } else {
      await supabaseAdmin.from("user_sessions").insert({
        user_id: input.userId,
        ip_address: input.meta.ip,
        user_agent: input.meta.userAgent,
        browser: input.meta.browser,
        device: input.meta.device,
        remember_me: input.rememberMe,
        last_seen_at: now,
      });
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: now })
      .eq("id", input.userId);
  } catch (error) {
    console.error("[auth] session bookkeeping failed", error);
  }
}