import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const amsStudentProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ childId: z.string().uuid(), month: z.string().regex(/^\d{4}-\d{2}$/) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getStudentProfile } = await import("./student-profile.server");
    return getStudentProfile(context.supabase, context.userId, data);
  });
