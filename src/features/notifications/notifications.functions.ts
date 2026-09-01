import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listMyNotifications, markKindRead, markRead, unreadCountsByKind } from "./notifications.server";

export const myNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyNotifications(context.supabase, context.userId));

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).max(100).nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => markRead(context.supabase, data.ids ?? null));

export const notificationCounters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => unreadCountsByKind(context.supabase, context.userId));

export const markNotificationKindRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ kinds: z.array(z.string().max(60)).min(1).max(10) }).parse(data),
  )
  .handler(async ({ data, context }) => markKindRead(context.supabase, context.userId, data.kinds));
