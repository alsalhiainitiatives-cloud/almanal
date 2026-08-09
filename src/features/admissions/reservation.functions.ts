import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  reservationPreferencesSchema,
  reservationSchema,
  reservationStaffUpdateSchema,
} from "./reservation-schema";
import {
  cancelMyReservation,
  createReservation,
  decideReservation,
  findDuplicateChildIds,
  listMyReservations,
  listReservationEvents,
  listReservations,
  purgeOldReservations,
  reservationGate,
  staffDeleteReservation,
  staffUpdateReservation,
  startFromReservation,
  updateMyReservationPreferences,
  withdrawMyReservation,
} from "./reservation.server";

export const submitSeatReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reservationSchema.parse(data))
  .handler(async ({ data, context }) => createReservation(context.supabase, context.userId, data));

export const mySeatReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyReservations(context.supabase, context.userId));

export const seatReservationGate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => reservationGate(context.supabase, context.userId));

export const staffSeatReservations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listReservations(context.supabase));

export const decideSeatReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().max(500).nullable().optional(),
        placements: z
          .array(
            z.object({
              childId: z.string().uuid(),
              classroomId: z.string().uuid().nullable(),
              waitlisted: z.boolean(),
            }),
          )
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => decideReservation(context.supabase, context.userId, data));

export const startApplicationFromReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => startFromReservation(context.supabase, context.userId, data));

export const cancelSeatReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => cancelMyReservation(context.supabase, context.userId, data));

export const updateSeatReservationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reservationPreferencesSchema.parse(data))
  .handler(async ({ data, context }) =>
    updateMyReservationPreferences(context.supabase, context.userId, data),
  );

export const withdrawSeatReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), note: z.string().trim().max(500).nullable().optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    withdrawMyReservation(context.supabase, context.userId, data.id, data.note ?? null),
  );

export const seatReservationEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => listReservationEvents(context.supabase, data));

/** Live Step 0 check: which of these child IDs already exist this academic year. */
export const checkReservationChildIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ nationalIds: z.array(z.string()) }).parse(data))
  .handler(async ({ data, context }) => ({
    duplicates: await findDuplicateChildIds(context.supabase, data.nationalIds),
  }));

export const updateSeatReservationByStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reservationStaffUpdateSchema.parse(data))
  .handler(async ({ data, context }) => staffUpdateReservation(context.supabase, context.userId, data));

export const deleteSeatReservationByStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => staffDeleteReservation(context.supabase, context.userId, data));

/** Bulk cleanup of old Step 0 requests (staff tool in تخصيص نظام التسجيل). */
export const purgeOldSeatReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        days: z.number().int().min(1).max(3650),
        statuses: z
          .array(z.enum(["pending_review", "approved", "rejected", "withdrawn"]))
          .min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    purgeOldReservations(context.supabase, context.userId, data),
  );
