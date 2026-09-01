import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const academicsReportBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classroomId: z.string().uuid().nullable().optional(),
        childId: z.string().uuid().nullable().optional(),
        reportType: z.enum(["weekly", "monthly", "term"]).nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getReportBoard } = await import("./reports.server");
    return getReportBoard(context.supabase, context.userId, data);
  });

export const academicsSetReportsVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: z.string().uuid(), visible: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setReportsVisibleToParents } = await import("./reports.server");
    return setReportsVisibleToParents(context.supabase, context.userId, data);
  });

export const academicsParentReportBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: z.string().uuid().nullable().optional(),
        reportType: z.enum(["weekly", "monthly", "term"]).nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getParentReportBoard } = await import("./reports.server");
    return getParentReportBoard(context.supabase, context.userId, data);
  });
