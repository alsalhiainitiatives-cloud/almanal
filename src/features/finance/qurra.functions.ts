import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getQurraBoard,
  prefillQurraAnnualDues,
  saveQurraAnnualDue,
  saveQurraCell,
} from "./qurra.server";

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

export const qurraAnnualDueSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: uuid,
        academicYear: year,
        totalDue: z.number().min(0).max(10_000_000),
        note: z.string().max(500).nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveQurraAnnualDue(context.supabase, context.userId, data));

export const qurraAnnualPrefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ academicYear: year, months: z.number().int().min(1).max(12).nullish() }).parse(data),
  )
  .handler(async ({ data, context }) => prefillQurraAnnualDues(context.supabase, context.userId, data));
