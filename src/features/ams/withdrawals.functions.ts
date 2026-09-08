import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCertificate,
  cancelWithdrawal,
  confirmWithdrawal,
  createWithdrawal,
  deleteWithdrawal,
  listWithdrawals,
  updateWithdrawal,
} from "./withdrawals.server";

const uuid = z.string().uuid();
const text = (max: number) => z.string().trim().max(max).nullish();
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullish();

export const amsWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listWithdrawals(context.supabase, context.userId));

export const amsWithdrawalCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: uuid,
        kind: z.enum(["withdrawal", "graduation"]),
        reason: z.string().trim().min(2).max(60),
        reasonNote: text(600),
        destinationSchool: text(160),
        effectiveDate: dateStr,
        financeNote: text(600),
        notes: text(600),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => createWithdrawal(context.supabase, context.userId, data));

export const amsWithdrawalUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        reason: z.string().trim().min(2).max(60).optional(),
        reasonNote: text(600),
        destinationSchool: text(160),
        effectiveDate: dateStr,
        financeCleared: z.boolean().optional(),
        financeNote: text(600),
        notes: text(600),
        refreshFinance: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => updateWithdrawal(context.supabase, context.userId, data));

export const amsWithdrawalConfirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, force: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => confirmWithdrawal(context.supabase, context.userId, data));

export const amsWithdrawalCancel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => cancelWithdrawal(context.supabase, context.userId, data));

export const amsWithdrawalDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteWithdrawal(context.supabase, context.userId, data));

export const amsWithdrawalCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uuid.parse(data))
  .handler(async ({ data, context }) => buildCertificate(context.supabase, context.userId, data));
