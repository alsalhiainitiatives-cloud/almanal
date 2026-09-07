import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getQurraBoard, prefillQurraMonth, saveQurraCell } from "./qurra.server";

const uuid = z.string().uuid();
const year = z.string().trim().min(4).max(40);

export const qurraBoardGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ academicYear: z.string().nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => getQurraBoard(context.supabase, context.userId, data));

export const qurraCellSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: uuid,
        academicYear: year,
        month: z.number().int().min(1).max(12),
        dueAmount: z.number().min(0).max(1_000_000).nullish(),
        transferredAmount: z.number().min(0).max(1_000_000).nullish(),
        confirmed: z.boolean().nullish(),
        note: z.string().max(500).nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveQurraCell(context.supabase, context.userId, data));

export const qurraMonthPrefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ academicYear: year, month: z.number().int().min(1).max(12) }).parse(data),
  )
  .handler(async ({ data, context }) => prefillQurraMonth(context.supabase, context.userId, data));
