import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const saveSchema = z.object({
  childId: z.string().uuid(),
  lessonId: z.string().uuid(),
  classroomId: z.string().uuid(),
  performanceLevel: z.number().int().min(0).max(3),
  growthLevel: z.number().int().min(0).max(3),
  performanceColors: z.array(hex).max(3),
  growthColors: z.array(hex).max(3),
  note: z.string().max(1000).nullable().optional(),
});

export const assessmentsBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ classroomId: z.string().uuid().nullable().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getAssessmentBoard } = await import("./assessments.server");
    return getAssessmentBoard(context.supabase, context.userId, data);
  });

export const assessmentsSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveAssessment } = await import("./assessments.server");
    return saveAssessment(context.supabase, context.userId, data);
  });

export const assessmentsEnsureCell = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: z.string().uuid(),
        lessonId: z.string().uuid(),
        classroomId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { ensureAssessment } = await import("./assessments.server");
    return ensureAssessment(context.supabase, context.userId, data);
  });

export const assessmentsAddEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        filePath: z.string().min(3).max(400).nullable().optional(),
        externalUrl: z.string().url().max(1000).nullable().optional(),
        fileType: z.enum(["image", "video", "pdf", "link"]),
        fileName: z.string().max(240).nullable().optional(),
        fileSize: z.number().int().nonnegative().nullable().optional(),
      })
      .refine((v) => Boolean(v.filePath || v.externalUrl), {
        message: "يجب رفع ملف أو إدخال رابط للدليل.",
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { addAssessmentEvidence } = await import("./assessments.server");
    return addAssessmentEvidence(context.supabase, context.userId, data);
  });


export const assessmentsDeleteEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { deleteAssessmentEvidence } = await import("./assessments.server");
    return deleteAssessmentEvidence(context.supabase, data.id);
  });
