import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addNote,
  archiveApplication,
  assignOfficer,
  decideApplication,
  documentSignedUrl,
  getOverview,
  getWorkspace,
  listQueue,
  listStaff,
  listWaitingList,
  manageSeat,
  moveToWaitingList,
  recommendToPrincipal,
  requestDocuments,
  requestCorrections,
  reviewDocument,
  setPaymentStatus,
  setPriority,
  startReview,
  togglePin,
  updateQurra,
} from "./ams.server";

const uuid = z.string().uuid();

export const amsQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.string().nullable().optional(),
        stageId: z.string().nullable().optional(),
        classroomId: z.string().nullable().optional(),
        officerId: z.string().nullable().optional(),
        qurra: z.string().nullable().optional(),
        payment: z.string().nullable().optional(),
        academicYear: z.string().nullable().optional(),
        includeArchived: z.boolean().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => listQueue(context.supabase, context.userId, data));

export const amsStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listStaff(context.supabase, context.userId));

export const amsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getOverview(context.supabase, context.userId));

export const amsWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uuid.parse(data))
  .handler(async ({ data, context }) => getWorkspace(context.supabase, context.userId, data));

export const amsWaitingList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listWaitingList(context.supabase, context.userId));

export const amsAssignOfficer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, officerId: uuid.nullable(), note: z.string().max(500).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => assignOfficer(context.supabase, context.userId, data));

export const amsSetPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, priority: z.enum(["low", "normal", "high", "urgent"]) }).parse(data),
  )
  .handler(async ({ data, context }) => setPriority(context.supabase, context.userId, data));

export const amsStartReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, note: z.string().max(500).optional() }).parse(data))
  .handler(async ({ data, context }) => startReview(context.supabase, context.userId, data));

export const amsReviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        documentId: uuid,
        status: z.enum(["approved", "rejected", "replace"]),
        note: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => reviewDocument(context.supabase, context.userId, data));

export const amsDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, documentId: uuid }).parse(data))
  .handler(async ({ data, context }) => documentSignedUrl(context.supabase, context.userId, data));

export const amsRequestDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        items: z
          .array(z.object({ slug: z.string().min(1).max(80), childIndex: z.number().int().nullable() }))
          .min(1)
          .max(30),
        note: z.string().max(800).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => requestDocuments(context.supabase, context.userId, data));

export const amsRequestCorrections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        sections: z
          .array(z.enum(["parent", "children", "qurra", "services", "documents"]))
          .min(1)
          .max(5),
        note: z.string().trim().min(5).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => requestCorrections(context.supabase, context.userId, data));

export const amsRecommend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, recommendation: z.string().trim().min(5).max(1000) }).parse(data),
  )
  .handler(async ({ data, context }) => recommendToPrincipal(context.supabase, context.userId, data));

export const amsDecide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().min(3).max(1000),
        signature: z.string().trim().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => decideApplication(context.supabase, context.userId, data));

export const amsManageSeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        action: z.enum(["reserve", "release", "transfer"]),
        classroomId: uuid.nullable().optional(),
        note: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => manageSeat(context.supabase, context.userId, data));

export const amsMoveToWaitingList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, classroomId: uuid.nullable(), note: z.string().max(500).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => moveToWaitingList(context.supabase, context.userId, data));

export const amsUpdateQurra = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum([
          "eligible",
          "waiting_school_review",
          "submitted_to_qurra",
          "waiting_response",
          "approved",
          "rejected",
          "not_requested",
        ]),
        note: z.string().max(800).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => updateQurra(context.supabase, context.userId, data));

export const amsAddNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        body: z.string().trim().min(2).max(4000),
        visibility: z.enum(["internal", "confidential", "parent"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => addNote(context.supabase, context.userId, data));

export const amsSetPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(["unpaid", "partial", "paid", "waived"]),
        note: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => setPaymentStatus(context.supabase, context.userId, data));

export const amsArchive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, note: z.string().max(500).optional() }).parse(data))
  .handler(async ({ data, context }) => archiveApplication(context.supabase, context.userId, data));

export const amsTogglePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, pinned: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => togglePin(context.supabase, context.userId, data));