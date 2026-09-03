import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const amsGuardianLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listGuardianLinks } = await import("./guardians.server");
    return listGuardianLinks(context.supabase, context.userId);
  });

export const amsGuardianInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childIds: z.array(uuid).min(1),
        overrides: z
          .record(
            z.string(),
            z.object({
              name: z.string().trim().max(120).nullish(),
              phone: z.string().trim().max(20).nullish(),
              email: z.string().trim().max(160).nullish(),
            }),
          )
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { createGuardianInvitations } = await import("./guardians.server");
    return createGuardianInvitations(context.supabase, context.userId, data);
  });

export const amsGuardianRevoke = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => {
    const { revokeGuardianInvitation } = await import("./guardians.server");
    return revokeGuardianInvitation(context.supabase, context.userId, data);
  });

/** Signed-in guardian accepts the invitation and gets linked to all children. */
export const claimGuardianInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().trim().min(16).max(80) }).parse(data))
  .handler(async ({ data, context }) => {
    const { claimInvitation } = await import("./guardians.server");
    const result = await claimInvitation(context.supabase, data.token);
    // Linked children with no invoice yet need a payment plan: notify guardian + finance.
    const { notifyMissingPlansForParent } = await import("@/features/finance/finance.server");
    const plans = await notifyMissingPlansForParent(context.supabase, context.userId);
    return { ...result, pendingPlans: plans.pending };
  });
