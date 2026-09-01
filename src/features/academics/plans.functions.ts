import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  lessonId: z.string().uuid().nullable().optional(),
  lessonNameAr: z.string().min(1).max(200),
  subjectNameAr: z.string().max(200).nullable().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#7A1F3D"),
  scheduledDay: z.number().int().min(0).max(4),
  scheduledTime: z.string().max(20).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).nullable().optional(),
  notes: z.string().max(600).nullable().optional(),
});

const savePlanSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  classroomId: z.string().uuid(),
  planType: z.enum(["weekly", "monthly"]).default("weekly"),
  titleAr: z.string().max(160).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  published: z.boolean().default(false),
  items: z.array(itemSchema).max(200).default([]),
});

export const plansForClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ classroomId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { listClassroomPlans } = await import("./plans.server");
    return listClassroomPlans(context.supabase, data.classroomId);
  });

export const plansSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => savePlanSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveStudyPlan } = await import("./plans.server");
    return saveStudyPlan(context.supabase, context.userId, data);
  });

export const plansDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteStudyPlan } = await import("./plans.server");
    return deleteStudyPlan(context.supabase, data.id);
  });

export const plansSetPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setStudyPlanPublished } = await import("./plans.server");
    return setStudyPlanPublished(context.supabase, data.id, data.published);
  });

export const plansParentBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getParentPlanBoard } = await import("./plans.server");
    return getParentPlanBoard(context.supabase, context.userId);
  });
