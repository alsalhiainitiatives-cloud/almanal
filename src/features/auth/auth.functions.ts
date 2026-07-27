import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileSchema, signInSchema } from "./schemas";
import {
  buildSecurityContext,
  performSignIn,
  revokeOtherSessionRecords,
  saveProfile,
  writeSecurityEvent,
} from "./service.server";

/**
 * Public sign-in endpoint. Credentials are verified server-side so a mobile
 * number can be used as an identifier without exposing anyone's email address.
 * Brute-force protection, login attempts and audit logging are handled inside.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signInSchema.parse(data))
  .handler(async ({ data }) => performSignIn(data));

/** Profile + roles + effective permissions + active sessions for the caller. */
export const getSecurityContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildSecurityContext(context.supabase, context.userId));

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data, context }) => saveProfile(context.supabase, context.userId, data));

/** "Logout from all other devices" bookkeeping (Supabase revokes the tokens). */
export const revokeOtherSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => revokeOtherSessionRecords(context.supabase, context.userId));

export const logSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((action: string) => String(action).slice(0, 80))
  .handler(async ({ data, context }) => writeSecurityEvent(context.userId, data));