import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const templatesList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ classroomId: z.string().uuid().nullable().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { listMessageTemplates } = await import("./templates.server");
    return listMessageTemplates(context.supabase, context.userId, data);
  });

export const templatesSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable().optional(),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(4000),
        classroomId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { saveMessageTemplate } = await import("./templates.server");
    return saveMessageTemplate(context.supabase, context.userId, data);
  });

export const templatesDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteMessageTemplate } = await import("./templates.server");
    return deleteMessageTemplate(context.supabase, context.userId, data.id);
  });
