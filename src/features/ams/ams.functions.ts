import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addNote,
  archiveApplication,
  assignOfficer,
  decideApplication,
  deleteClassroom,
  documentSignedUrl,
  getOverview,
  getWorkspace,
  getSeatBoard,
  listActivity,
  listQueue,
  listStaff,
  listWaitingList,
  manageSeat,
  moveToWaitingList,
  nudgePrincipal,
  recommendToPrincipal,
  requestDocuments,
  requestCorrections,
  reviewDocument,
  saveClassroom,
  seatAssignChild,
  seatRemoveChild,
  seatUpdateChild,
  setPaymentStatus,
  setPriority,
  startReview,
  togglePin,
  updateQurra,
} from "./ams.server";
import { getReports } from "./reports.server";
import { getStudentFile, listStudents, setStudentPhoto } from "./students.server";

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

export const amsReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getReports(context.supabase, context.userId));

export const amsActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listActivity(context.supabase, context.userId));

export const amsSeatBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getSeatBoard(context.supabase, context.userId));

export const amsSeatAssign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ childId: uuid, classroomId: uuid }).parse(data))
  .handler(async ({ data, context }) => seatAssignChild(context.supabase, context.userId, data));

export const amsSeatRemove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ childId: uuid, note: z.string().max(500).optional() }).parse(data))
  .handler(async ({ data, context }) => seatRemoveChild(context.supabase, context.userId, data));

export const amsSeatUpdateChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        childId: uuid,
        name_ar: z.string().trim().min(2).max(120).optional(),
        birth_date: z.string().trim().min(8).max(20).nullable().optional(),
        national_id: z.string().trim().max(20).nullable().optional(),
        nationality: z.string().trim().max(60).nullable().optional(),
        gender: z.string().trim().max(20).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => seatUpdateChild(context.supabase, context.userId, data));

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

export const amsNudgePrincipal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: uuid, note: z.string().trim().max(500).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => nudgePrincipal(context.supabase, context.userId, data));

export const amsDecide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid,
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(1000).optional(),
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
const classroomInput = z.object({
  id: uuid.nullish(),
  stage_id: uuid,
  slug: z.string().max(60).nullish(),
  name_ar: z.string().trim().min(2).max(80),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "اللون غير صالح"),
  color_label: z.string().max(60).nullish(),
  teacher_name: z.string().max(120).nullish(),
  teacher_title: z.string().max(120).nullish(),
  teacher_qualification: z.string().max(300).nullish(),
  teacher_experience: z.string().max(800).nullish(),
  teachers: z
    .array(
      z.object({
        name: z.string().trim().max(120),
        title: z.string().max(120).optional(),
        qualification: z.string().max(300).optional(),
        experience: z.string().max(800).optional(),
        photo_url: z.string().max(400).nullish(),
        cv_url: z.string().max(400).nullish(),
        cv_name: z.string().max(200).nullish(),
      }),
    )
    .max(12)
    .optional(),
  cover_image: z.string().max(400).nullish(),
  gallery: z
    .array(z.object({ path: z.string().min(1).max(400), caption: z.string().max(200).nullish() }))
    .max(24)
    .optional(),
  capacity: z.number().int().min(1).max(200),
  max_waiting: z.number().int().min(0).max(200),
  min_age_months: z.number().int().min(0).max(300),
  max_age_months: z.number().int().min(1).max(300),
  description_ar: z.string().max(1000).nullish(),
  learning_style_ar: z.string().max(300).nullish(),
  schedule_ar: z.string().max(300).nullish(),
  daily_schedule: z
    .array(z.object({ time: z.string().max(60), activity: z.string().max(200) }))
    .max(24)
    .optional(),
  sort_order: z.number().int().min(0).max(999).nullish(),
  is_active: z.boolean().optional(),
});

export const amsClassroomSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => classroomInput.parse(data))
  .handler(async ({ data, context }) => saveClassroom(context.supabase, context.userId, data));

export const amsClassroomDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteClassroom(context.supabase, context.userId, data));

export const amsStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        stageId: z.string().nullable().optional(),
        classroomId: z.string().nullable().optional(),
        academicYear: z.string().nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => listStudents(context.supabase, context.userId, data));

export const amsStudentFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uuid.parse(data))
  .handler(async ({ data, context }) => getStudentFile(context.supabase, context.userId, data));

export const myChildren = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMyChildren(context.supabase, context.userId));

export const myChildFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uuid.parse(data))
  .handler(async ({ data, context }) => getMyStudentFile(context.supabase, context.userId, data));

export const amsStudentPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ childId: uuid, photoUrl: z.string().max(400).nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => setStudentPhoto(context.supabase, context.userId, data));
