import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WIPE_CONFIRM_WORD } from "./maintenance";

const windowSchema = z.object({ window: z.enum(["1m", "3m", "6m", "term"]) });

const scopeSchema = z.object({
  scope: z.enum(["classroom", "stage", "all"]),
  classroomId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
});

export const maintenanceBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getMaintenanceBoard } = await import("./maintenance.server");
    return getMaintenanceBoard(context.supabase, context.userId);
  });

export const maintenancePreviewEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => windowSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { previewEvidenceCleanup } = await import("./maintenance.server");
    return previewEvidenceCleanup(context.supabase, context.userId, data);
  });

export const maintenanceCleanEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    windowSchema.extend({ confirm: z.literal(WIPE_CONFIRM_WORD) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runEvidenceCleanup } = await import("./maintenance.server");
    return runEvidenceCleanup(context.supabase, context.userId, { window: data.window });
  });

export const maintenancePreviewChatWipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scopeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { previewChatWipe } = await import("./maintenance.server");
    return previewChatWipe(context.supabase, context.userId, data);
  });

export const maintenanceWipeChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    scopeSchema.extend({ confirm: z.literal(WIPE_CONFIRM_WORD) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { runChatWipe } = await import("./maintenance.server");
    return runChatWipe(context.supabase, context.userId, data);
  });
