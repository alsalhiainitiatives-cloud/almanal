import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subjectSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  classroomId: z.string().uuid(),
  nameAr: z.string().min(2).max(120),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#7A1F3D"),
  isActive: z.boolean().default(true),
});

const topicSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid(),
  nameAr: z.string().min(2).max(120),
  isActive: z.boolean().default(true),
});

const lessonSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  topicId: z.string().uuid(),
  nameAr: z.string().min(2).max(160),
  descriptionAr: z.string().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const academicsClassrooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAccessibleClassrooms } = await import("./academics.server");
    return listAccessibleClassrooms(context.supabase, context.userId);
  });

export const academicsCurriculum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ classroomId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { getCurriculumTree } = await import("./academics.server");
    return getCurriculumTree(context.supabase, data.classroomId);
  });

export const academicsSaveSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subjectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveSubject } = await import("./academics.server");
    return saveSubject(context.supabase, context.userId, data);
  });

export const academicsSaveTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => topicSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveTopic } = await import("./academics.server");
    return saveTopic(context.supabase, context.userId, data);
  });

export const academicsSaveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => lessonSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveLesson } = await import("./academics.server");
    return saveLesson(context.supabase, context.userId, data);
  });

export const academicsDeleteNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ kind: z.enum(["subject", "topic", "lesson"]), id: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { deleteCurriculumNode } = await import("./academics.server");
    return deleteCurriculumNode(context.supabase, data.kind, data.id);
  });

export const academicsAssignmentBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAssignmentBoard } = await import("./academics.server");
    return getAssignmentBoard(context.supabase, context.userId);
  });

export const academicsSetClassroomTeachers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ classroomId: z.string().uuid(), teacherIds: z.array(z.string().uuid()).max(20) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setClassroomTeachers } = await import("./academics.server");
    return setClassroomTeachers(context.supabase, context.userId, data.classroomId, data.teacherIds);
  });

export const academicsSetTeacherClassrooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ teacherId: z.string().uuid(), classroomIds: z.array(z.string().uuid()).max(30) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { setTeacherClassrooms } = await import("./academics.server");
    return setTeacherClassrooms(context.supabase, context.userId, data.teacherId, data.classroomIds);
  });
