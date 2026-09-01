import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const monthColorsSchema = z
  .array(
    z.object({
      month: z.number().int().min(1).max(12),
      hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      label: z.string().min(1).max(40),
    }),
  )
  .max(12);

export const academicsSettingsBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAcademicsSettings } = await import("./settings.server");
    return getAcademicsSettings(context.supabase, context.userId);
  });

export const academicsSaveMonthColors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ monthColors: monthColorsSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { saveMonthColors } = await import("./settings.server");
    return saveMonthColors(context.supabase, context.userId, data.monthColors);
  });

export const academicsSetChatGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ enabled: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { setChatEnabledGlobally } = await import("./settings.server");
    return setChatEnabledGlobally(context.supabase, context.userId, data.enabled);
  });

export const academicsSetChatClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: z.string().uuid(), enabled: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setClassroomChatEnabled } = await import("./settings.server");
    return setClassroomChatEnabled(context.supabase, context.userId, data);
  });
