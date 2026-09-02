import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthKey = z.string().regex(/^\d{4}-\d{2}$/);
const status = z.enum(["present", "absent", "late", "excused"]);

export const amsAttendanceClassrooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAttendanceClassrooms } = await import("./attendance.server");
    return listAttendanceClassrooms(context.supabase);
  });

export const amsAttendanceBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: uuid, date: isoDate, month: monthKey }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getAttendanceBoard } = await import("./attendance.server");
    return getAttendanceBoard(context.supabase, data);
  });

export const amsAttendanceSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        classroomId: uuid,
        date: isoDate,
        entries: z
          .array(
            z.object({
              childId: uuid,
              status: status.nullable(),
              note: z.string().trim().max(300).nullish(),
            }),
          )
          .min(1)
          .max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { saveAttendance } = await import("./attendance.server");
    return saveAttendance(context.supabase, context.userId, data);
  });

export const childAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ childId: uuid, month: monthKey }).parse(data))
  .handler(async ({ data, context }) => {
    const { getChildAttendance } = await import("./attendance.server");
    return getChildAttendance(context.supabase, data);
  });
