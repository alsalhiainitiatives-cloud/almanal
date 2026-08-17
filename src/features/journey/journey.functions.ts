import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  classroomId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2).max(160),
  subject: z.string().max(160).nullable().optional(),
  lessons: z.string().max(4000).nullable().optional(),
  activities: z.string().max(4000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "published"]),
});

const skillSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  childId: z.string().uuid(),
  classroomId: z.string().uuid().nullable().optional(),
  skillName: z.string().min(2).max(160),
  domain: z.string().max(160).nullable().optional(),
  completion: z.number().min(0).max(100),
  improvement: z.number().min(0).max(100),
  note: z.string().max(2000).nullable().optional(),
  observedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const journeyTeacherHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: z.string().uuid().nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getTeacherHub } = await import("./journey.server");
    return getTeacherHub(context.supabase, context.userId, data);
  });

export const journeyParentView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getParentJourney } = await import("./journey.server");
    return getParentJourney(context.supabase, context.userId);
  });

export const journeySavePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { savePlan } = await import("./journey.server");
    return savePlan(context.supabase, context.userId, data);
  });

export const journeyDeletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deletePlan } = await import("./journey.server");
    return deletePlan(context.supabase, context.userId, data.id);
  });

export const journeySaveSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => skillSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveSkill } = await import("./journey.server");
    return saveSkill(context.supabase, context.userId, data);
  });

export const journeyDeleteSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteSkill } = await import("./journey.server");
    return deleteSkill(context.supabase, context.userId, data.id);
  });

export const journeyAddEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        trackingId: z.string().uuid(),
        filePath: z.string().min(3).max(400),
        fileType: z.enum(["image", "video", "audio"]),
        fileName: z.string().max(240).nullable().optional(),
        fileSize: z.number().int().nonnegative().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { addEvidence } = await import("./journey.server");
    return addEvidence(context.supabase, context.userId, data);
  });

export const journeyDeleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteEvidence } = await import("./journey.server");
    return deleteEvidence(context.supabase, context.userId, data.id);
  });

export const journeyAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listTeacherAssignments } = await import("./journey.server");
    return listTeacherAssignments(context.supabase, context.userId);
  });

export const journeySetAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ teacherId: z.string().uuid(), classroomIds: z.array(z.string().uuid()).max(40) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setTeacherClassrooms } = await import("./journey.server");
    return setTeacherClassrooms(context.supabase, context.userId, data);
  });