import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { childrenSchema, qurraSchema } from "./schemas";
import {
  checkDuplicateChild,
  continueWithoutQurra,
  deleteDraftApplication,
  getApplicationBundle,
  listMyApplications,
  recordDocument,
  removeDocument,
  saveChildren,
  saveDraft,
  saveQurra,
  saveServices,
  startApplication,
  submitApplication,
  withdrawApplication,
} from "./application.server";

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        stageId: z.string().uuid().nullable(),
        classroomId: z.string().uuid().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => startApplication(context.supabase, context.userId, data));

export const getApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => getApplicationBundle(context.supabase, context.userId, data));

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyApplications(context.supabase, context.userId));

export const saveApplicationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        step: z.number().int().min(1).max(10),
        draft: z.record(z.string(), z.unknown()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveDraft(context.supabase, context.userId, data));

export const checkChildDuplicate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        nationalId: z.string().regex(/^\d{10}$/),
        excludeApplicationId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => checkDuplicateChild(context.supabase, context.userId, data));

export const saveApplicationChildren = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), children: childrenSchema }).parse(data),
  )
  .handler(async ({ data, context }) => saveChildren(context.supabase, context.userId, data));

export const saveApplicationQurra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), qurra: qurraSchema }).parse(data),
  )
  .handler(async ({ data, context }) => saveQurra(context.supabase, context.userId, data));

export const saveApplicationServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), serviceIds: z.array(z.string().uuid()).max(20) }).parse(data),
  )
  .handler(async ({ data, context }) => saveServices(context.supabase, context.userId, data));

export const saveApplicationDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        slug: z.string().max(60),
        filePath: z.string().max(400),
        fileName: z.string().max(200),
        fileSize: z.number().int().min(0).max(20_000_000),
        childIndex: z.number().int().min(0).max(10).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => recordDocument(context.supabase, context.userId, data));

export const deleteApplicationDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), docId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => removeDocument(context.supabase, context.userId, data));

export const submitApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => submitApplication(context.supabase, context.userId, data));

export const withdrawApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => withdrawApplication(context.supabase, context.userId, data));

export const continueWithoutQurraFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => continueWithoutQurra(context.supabase, context.userId, data));

export const deleteDraftApplicationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data, context }) => deleteDraftApplication(context.supabase, context.userId, data));