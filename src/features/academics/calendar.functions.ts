import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const academicsCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classroomId: z.string().uuid(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getClassCalendar } = await import("./calendar.server");
    return getClassCalendar(context.supabase, data);
  });

export const adminTeacherDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ teacherId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getTeacherDetail } = await import("./calendar.server");
    return getTeacherDetail(context.supabase, context.userId, data.teacherId);
  });
