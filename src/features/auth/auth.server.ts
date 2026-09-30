/**
 * Server-only auth helpers: request forensics, brute-force protection,
 * audit logging, identifier resolution and session bookkeeping.
 *
 * Never import this file from client code (`*.server.ts` is blocked from the
 * browser bundle). Server functions in `auth.functions.ts` are the entry points.
 */
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

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

/**
 * Publishable-key client that acts as the caller when the request carries a
 * bearer token, otherwise as an anonymous visitor. All privileged bookkeeping
 * goes through SECURITY DEFINER database functions — no service key needed.
 */
function requestClient() {
  let authorization: string | null = null;
  try {
    authorization = getRequest()?.headers.get("authorization") ?? null;
  } catch {
    authorization = null;
  }
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: authorization?.toLowerCase().startsWith("bearer ")
      ? { headers: { Authorization: authorization } }
      : undefined,
  });
}

export async function recordLoginAttempt(input: {
  identifier: string;
  success: boolean;
  meta: RequestMeta;
}) {
  try {
    await requestClient().rpc("log_login_attempt", {
      _identifier: input.identifier,
      _ip: input.meta.ip ?? "",
      _user_agent: input.meta.userAgent ?? "",
      _success: input.success,
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
    const { error } = await requestClient().rpc("write_audit_log", {
      _user_id: input.userId ?? (null as unknown as string),
      _actor_email: input.actorEmail ?? "",
      _action: input.action,
      _entity: input.entity ?? "",
      _entity_id: input.entityId ?? "",
      _success: input.success ?? true,
      _metadata: (input.metadata ?? {}) as never,
      _ip: input.meta.ip ?? "",
      _user_agent: input.meta.userAgent ?? "",
      _browser: input.meta.browser,
      _device: input.meta.device,
    });
    if (error) console.error("[auth] audit log rejected", error.message);
  } catch (error) {
    console.error("[auth] failed to write audit log", error);
  }
}

/** Brute-force protection: too many recent failures for the identifier or IP. */
export async function isRateLimited(identifier: string, ip: string | null): Promise<boolean> {
  try {
    const { data } = await requestClient().rpc("login_rate_limited", {
      _identifier: identifier.toLowerCase(),
      _ip: ip ?? (null as unknown as string),
      _window_minutes: LOCKOUT_WINDOW_MINUTES,
      _max: MAX_FAILED_ATTEMPTS,
    });
    return data === true;
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
    const { data } = await requestClient().rpc("resolve_login_email", { _phone_tail: phone });
    return (data as string | null) ?? null;
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
  accessToken: string;
}) {
  try {
    const client = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
      },
    );
    const { error } = await client.rpc("register_my_session", {
      _remember: input.rememberMe,
      _ip: input.meta.ip ?? "",
      _user_agent: input.meta.userAgent ?? "",
      _browser: input.meta.browser,
      _device: input.meta.device,
    });
    if (error) console.error("[auth] session bookkeeping rejected", error.message);
  } catch (error) {
    console.error("[auth] session bookkeeping failed", error);
  }
}
