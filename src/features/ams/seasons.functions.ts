import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteSeason, listSeasons, resolveActiveSeason, saveSeason, setSeasonStatus } from "./seasons.server";

const uuid = z.string().uuid();

export const amsSeasons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listSeasons(context.supabase, context.userId));

export const amsActiveSeason = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => resolveActiveSeason(context.supabase));

export const amsSeasonSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        academic_year: z.string().trim().min(4).max(40),
        name_ar: z.string().trim().min(2).max(120),
        kind: z.enum(["regular", "supplementary"]),
        starts_at: z.string().min(8),
        ends_at: z.string().min(8),
        reservation_enabled: z.boolean(),
        closure_message: z.string().max(500).nullish(),
        notes: z.string().max(1000).nullish(),
        status: z.enum(["draft", "open", "closed"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveSeason(context.supabase, context.userId, data));

export const amsSeasonStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, status: z.enum(["draft", "open", "closed"]) }).parse(data),
  )
  .handler(async ({ data, context }) => setSeasonStatus(context.supabase, context.userId, data));

export const amsSeasonDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteSeason(context.supabase, context.userId, data.id));