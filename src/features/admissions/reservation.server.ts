/**
 * Step 0 — Seat reservation requests.
 *
 * A deliberately lightweight entry point: the parent asks for a seat with a
 * handful of fields, staff review it, and only after approval does the parent
 * enter the full (unchanged) admission journey — pre-filled from this request.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { ageInMonths } from "./eligibility";
import { ACADEMIC_YEAR } from "./application.server";
import type { ReservationInput, ReservationPreferencesInput } from "./reservation-schema";
import { notify, STAFF_ROLES } from "@/features/notifications/notifications.server";

type Db = SupabaseClient<Database>;

const CHILD_COLUMNS =
  "id, name_ar, national_id, gender, birth_date, stage_id, preference_1_classroom_id, preference_2_classroom_id, preference_3_classroom_id, assigned_classroom_id, waitlisted, sort_order";

const EVENT_COLUMNS = "id, reservation_id, actor_name, actor_kind, action, title_ar, body_ar, created_at";

async function actorName(supabase: Db, userId: string) {
  const { data } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  return data?.full_name?.trim() || data?.email || null;
}

/** Append one entry to the reservation audit log (سجل التدقيق). */
async function logEvent(
  supabase: Db,
  reservationId: string,
  userId: string | null,
  entry: {
    action: string;
    title: string;
    body?: string | null;
    kind?: "parent" | "staff" | "system";
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("reservation_events").insert({
    reservation_id: reservationId,
    actor_id: userId,
    actor_name: userId ? await actorName(supabase, userId) : null,
    actor_kind: entry.kind ?? "parent",
    action: entry.action,
    title_ar: entry.title,
    body_ar: entry.body ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}

export async function listReservationEvents(supabase: Db, reservationId: string) {
  const { data } = await supabase
    .from("reservation_events")
    .select(EVENT_COLUMNS)
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/**
 * Global admin switch — when registration is closed no new seat reservation can
 * be created, whatever entry point the parent used.
 */
export async function assertRegistrationOpen(supabase: Db) {
  const { data } = await supabase.from("site_content").select("data").eq("key", "site").maybeSingle();
  const content = (data?.data ?? {}) as {
    admissions?: { registrationOpen?: boolean; closureMessage?: string };
  };
  const gate = content.admissions;
  if (gate && gate.registrationOpen === false) {
    throw new Error(
      gate.closureMessage?.trim() ||
        "باب التسجيل مغلق حالياً. نشكر لكم اهتمامكم بانضمام طفلكم لمجتمع المنال.",
    );
  }
}

export async function createReservation(supabase: Db, userId: string, input: ReservationInput) {
  await assertRegistrationOpen(supabase);
  const { data: existing } = await supabase
    .from("seat_reservations")
    .select("id")
    .eq("parent_id", userId)
    .eq("academic_year", ACADEMIC_YEAR)
    .eq("status", "pending_review")
    .maybeSingle();
  if (existing) throw new Error("لديك طلب حجز مقعد قيد المراجعة بالفعل — سنوافيك بالنتيجة قريبًا.");

  const { data: reservation, error } = await supabase
    .from("seat_reservations")
    .insert({
      parent_id: userId,
      academic_year: ACADEMIC_YEAR,
      parent_name: input.parentName,
      parent_national_id: input.parentNationalId,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (error || !reservation) throw new Error("تعذّر إرسال طلب حجز المقعد، حاول مرة أخرى.");

  const rows = input.children.map((c, index) => ({
    reservation_id: reservation.id,
    name_ar: c.nameAr,
    national_id: c.nationalId,
    gender: c.gender,
    birth_date: c.birthDate,
    stage_id: c.stageId || null,
    preference_1_classroom_id: c.preference1,
    preference_2_classroom_id: c.preference2 || null,
    preference_3_classroom_id: c.preference3 || null,
    sort_order: index,
  }));
  const { error: childErr } = await supabase.from("seat_reservation_children").insert(rows);
  if (childErr) {
    await supabase.from("seat_reservations").delete().eq("id", reservation.id);
    throw new Error("تعذّر حفظ بيانات الأطفال في طلب الحجز.");
  }

  await logEvent(supabase, reservation.id, userId, {
    action: "created",
    title: "تم إنشاء طلب حجز المقعد",
    body: `${input.children.length} طفل — بانتظار مراجعة الإدارة`,
  });

  await notify(supabase, {
    roles: STAFF_ROLES,
    kind: "reservation.created",
    title: "طلب حجز مقعد جديد",
    body: `${input.parentName} — ${input.children.length} طفل`,
    link: "/ams/reservations",
    severity: "warning",
  });

  return { id: reservation.id };
}

export async function listMyReservations(supabase: Db, userId: string) {
  const { data } = await supabase
    .from("seat_reservations")
    .select(`*, children:seat_reservation_children(${CHILD_COLUMNS})`)
    .eq("parent_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Staff queue (RLS grants staff read access to every reservation). */
export async function listReservations(supabase: Db) {
  const [{ data }, { data: classrooms }] = await Promise.all([
    supabase
      .from("seat_reservations")
      .select(
        `*, children:seat_reservation_children(${CHILD_COLUMNS}), events:reservation_events(${EVENT_COLUMNS})`,
      )
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("classrooms")
      .select("id, stage_id, name_ar, capacity, taken_seats, max_waiting, min_age_months, max_age_months, is_active")
      .order("sort_order"),
  ]);
  return { rows: data ?? [], classrooms: classrooms ?? [] };
}

type ClassroomRow = {
  id: string;
  name_ar: string;
  capacity: number;
  taken_seats: number;
  min_age_months: number;
  max_age_months: number;
  is_active: boolean | null;
};

/** Preference 1 → 2 → 3; the first age-appropriate classroom with a free seat wins. */
function pickClassroom(prefs: (string | null)[], months: number | null, rooms: ClassroomRow[]) {
  for (const id of prefs) {
    if (!id) continue;
    const room = rooms.find((r) => r.id === id);
    if (!room || room.is_active === false) continue;
    const ageOk =
      months === null || (months >= room.min_age_months && months <= room.max_age_months);
    const free = Math.max(0, room.capacity - room.taken_seats);
    if (ageOk && free > 0) return { room, waitlisted: false };
  }
  const firstPref = prefs.find(Boolean);
  const fallback = firstPref ? rooms.find((r) => r.id === firstPref) : undefined;
  return fallback ? { room: fallback, waitlisted: true } : null;
}

async function assertStaff(supabase: Db, userId: string) {
  const { data } = await supabase.rpc("is_school_staff", { _user_id: userId });
  if (!data) throw new Error("غير مصرح لك بمراجعة طلبات حجز المقاعد.");
}

export async function decideReservation(
  supabase: Db,
  userId: string,
  input: {
    id: string;
    action: "approve" | "reject";
    note?: string | null;
    /** Optional manual placement chosen by staff (overrides the auto rule). */
    placements?: { childId: string; classroomId: string | null; waitlisted: boolean }[];
  },
) {
  await assertStaff(supabase, userId);

  const { data: reservation } = await supabase
    .from("seat_reservations")
    .select(`*, children:seat_reservation_children(${CHILD_COLUMNS})`)
    .eq("id", input.id)
    .maybeSingle();
  if (!reservation) throw new Error("لم يتم العثور على طلب حجز المقعد.");
  if (reservation.status !== "pending_review") throw new Error("تم اتخاذ قرار بشأن هذا الطلب مسبقًا.");

  if (input.action === "reject") {
    const { error } = await supabase
      .from("seat_reservations")
      .update({
        status: "rejected",
        decided_by: userId,
        decided_at: new Date().toISOString(),
        decision_note: input.note ?? null,
      })
      .eq("id", input.id);
    if (error) throw new Error("تعذّر تحديث حالة طلب الحجز.");

    await logEvent(supabase, input.id, userId, {
      action: "rejected",
      kind: "staff",
      title: "تم رفض طلب الحجز",
      body: input.note ?? null,
    });

    await notify(supabase, {
      userIds: [reservation.parent_id],
      kind: "reservation.rejected",
      title: "تعذّر حجز المقعد حاليًا",
      body:
        input.note ||
        "وصل الفصل وقائمة الانتظار إلى الطاقة الاستيعابية القصوى. يسعدنا التواصل معك عند توفّر مقعد.",
      severity: "urgent",
    });
    return { ok: true as const, status: "rejected" as const, placements: [] };
  }

  const { data: rooms } = await supabase
    .from("classrooms")
    .select("id, name_ar, capacity, taken_seats, min_age_months, max_age_months, is_active");
  const classrooms = (rooms ?? []) as ClassroomRow[];

  const placements: { childId: string; name: string; classroom: string | null; waitlisted: boolean }[] = [];

  for (const child of reservation.children ?? []) {
    const months = ageInMonths(child.birth_date);
    const manual = input.placements?.find((p) => p.childId === child.id);
    const auto = pickClassroom(
      [child.preference_1_classroom_id, child.preference_2_classroom_id, child.preference_3_classroom_id],
      months,
      classrooms,
    );
    const manualRoom = manual?.classroomId
      ? classrooms.find((r) => r.id === manual.classroomId)
      : undefined;
    const pick = manual
      ? manualRoom
        ? { room: manualRoom, waitlisted: manual.waitlisted }
        : null
      : auto;
    await supabase
      .from("seat_reservation_children")
      .update({
        assigned_classroom_id: pick?.room.id ?? null,
        waitlisted: pick?.waitlisted ?? true,
      })
      .eq("id", child.id);

    if (pick && !pick.waitlisted) {
      const room = classrooms.find((r) => r.id === pick.room.id);
      if (room) room.taken_seats += 1; // avoid double-booking siblings in one decision
    }
    placements.push({
      childId: child.id,
      name: child.name_ar,
      classroom: pick?.room.name_ar ?? null,
      waitlisted: pick?.waitlisted ?? true,
    });
  }

  const { error } = await supabase
    .from("seat_reservations")
    .update({
      status: "approved",
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_note: input.note ?? null,
    })
    .eq("id", input.id);
  if (error) throw new Error("تعذّر تحديث حالة طلب الحجز.");

  const summary = placements
    .map((p) =>
      p.classroom
        ? `${p.name}: ${p.waitlisted ? `قائمة انتظار ${p.classroom}` : p.classroom}`
        : `${p.name}: بانتظار تحديد الفصل`,
    )
    .join(" · ");

  await logEvent(supabase, input.id, userId, {
    action: "approved",
    kind: "staff",
    title: "تم قبول الحجز وتسكين الأطفال",
    body: [summary, input.note].filter(Boolean).join(" — "),
    metadata: { placements },
  });

  await notify(supabase, {
    userIds: [reservation.parent_id],
    kind: "reservation.approved",
    title: "تم قبول حجز المقعد — أكمل التسجيل",
    body: `${summary}. تابع لاستكمال بيانات طلب التسجيل.`,
    link: "/my-applications",
    severity: "success",
  });

  return { ok: true as const, status: "approved" as const, placements };
}

/**
 * Parent continuation: turns an approved reservation into a draft application
 * whose wizard fields are already filled from Step 0.
 */
export async function startFromReservation(supabase: Db, userId: string, reservationId: string) {
  const { data: reservation } = await supabase
    .from("seat_reservations")
    .select(`*, children:seat_reservation_children(${CHILD_COLUMNS})`)
    .eq("id", reservationId)
    .maybeSingle();
  if (!reservation || reservation.parent_id !== userId) throw new Error("لم يتم العثور على طلب الحجز.");
  if (reservation.status !== "approved") throw new Error("لم تتم الموافقة على حجز المقعد بعد.");
  if (reservation.application_id) return { id: reservation.application_id };

  const children = [...(reservation.children ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const first = children[0];
  const saudiParent = reservation.parent_national_id.startsWith("1");

  const draftChildren = children.map((c) => ({
    nameAr: c.name_ar,
    nameEn: "",
    nationalId: c.national_id ?? "",
    gender: (c.gender === "female" ? "female" : "male") as "male" | "female",
    birthDate: c.birth_date ?? "",
    nationality: (c.national_id ?? "").startsWith("1") ? "سعودي" : "",
    country: "",
    birthPlace: "",
    photoUrl: "",
    bloodType: "",
    medicalConditions: "",
    allergies: "",
    specialNeeds: "",
    previousSchool: "",
    lastGrade: "",
    vaccinationStatus: "complete" as const,
    stageId: c.stage_id ?? "",
    classroomId: c.assigned_classroom_id ?? c.preference_1_classroom_id ?? "",
    preference2: c.preference_2_classroom_id ?? "",
    preference3: c.preference_3_classroom_id ?? "",
  }));

  const draftData = {
    parent: {
      fullName: reservation.parent_name,
      nationalId: reservation.parent_national_id,
      nationality: saudiParent ? "saudi" : "resident",
    },
    children: draftChildren,
    reservationId: reservation.id,
  };

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      parent_id: userId,
      stage_id: first?.stage_id ?? null,
      classroom_id: first?.assigned_classroom_id ?? null,
      academic_year: reservation.academic_year,
      status: "draft",
      current_step: 3,
      parent_national_id: reservation.parent_national_id,
      parent_nationality: saudiParent ? "saudi" : "resident",
      draft_data: draftData as never,
    })
    .select("id")
    .single();
  if (error || !application) throw new Error("تعذّر بدء طلب التسجيل من الحجز المقبول.");

  await supabase
    .from("seat_reservations")
    .update({ application_id: application.id })
    .eq("id", reservation.id);

  await supabase.from("application_events").insert({
    application_id: application.id,
    actor_id: userId,
    event_type: "application.created_from_reservation",
    title_ar: "تم إنشاء الطلب من حجز مقعد مقبول",
    body_ar: "تم تعبئة بيانات الخطوة صفر تلقائيًا.",
    metadata: { reservationId: reservation.id } as never,
  });

  await logEvent(supabase, reservation.id, userId, {
    action: "application_started",
    title: "تم بدء طلب التسجيل من الحجز المقبول",
    body: "البيانات المثبتة من الخطوة صفر أصبحت غير قابلة للتعديل في النموذج.",
  });

  return { id: application.id };
}

/** Used by the entry point to decide whether Step 0 is still required. */
export async function reservationGate(supabase: Db, userId: string) {
  const rows = await listMyReservations(supabase, userId);
  const current = rows.find((r) => r.academic_year === ACADEMIC_YEAR) ?? rows[0] ?? null;
  return {
    reservation: current,
    needsReservation: !current || current.status === "rejected" || current.status === "withdrawn",
    pending: current?.status === "pending_review",
    approved: current?.status === "approved",
  };
}

export async function cancelMyReservation(supabase: Db, userId: string, id: string) {
  const { error } = await supabase
    .from("seat_reservations")
    .delete()
    .eq("id", id)
    .eq("parent_id", userId)
    .eq("status", "pending_review");
  if (error) throw new Error("تعذّر إلغاء طلب الحجز.");
  return { ok: true as const };
}

/** Parent self-service — reorder/replace classroom preferences before review. */
export async function updateMyReservationPreferences(
  supabase: Db,
  userId: string,
  input: ReservationPreferencesInput,
) {
  const { data: reservation } = await supabase
    .from("seat_reservations")
    .select(`id, parent_id, status, children:seat_reservation_children(${CHILD_COLUMNS})`)
    .eq("id", input.id)
    .maybeSingle();
  if (!reservation || reservation.parent_id !== userId) throw new Error("لم يتم العثور على طلب الحجز.");
  if (reservation.status !== "pending_review")
    throw new Error("لا يمكن تعديل الرغبات بعد اتخاذ قرار بشأن الطلب.");

  const known = new Set((reservation.children ?? []).map((c) => c.id));
  for (const row of input.children) {
    if (!known.has(row.childId)) throw new Error("بيانات الطفل غير مطابقة لطلب الحجز.");
    const { error } = await supabase
      .from("seat_reservation_children")
      .update({
        preference_1_classroom_id: row.preference1,
        preference_2_classroom_id: row.preference2 || null,
        preference_3_classroom_id: row.preference3 || null,
      })
      .eq("id", row.childId)
      .eq("reservation_id", input.id);
    if (error) throw new Error("تعذّر تحديث رغبات الفصول.");
  }

  await logEvent(supabase, input.id, userId, {
    action: "preferences_updated",
    title: "تم تعديل رغبات الفصول",
    body: `تم تحديث رغبات ${input.children.length} طفل قبل المراجعة.`,
  });

  await notify(supabase, {
    roles: STAFF_ROLES,
    kind: "reservation.updated",
    title: "تم تعديل رغبات طلب حجز مقعد",
    body: "قام ولي الأمر بتحديث رغبات الفصول قبل المراجعة.",
    link: "/ams/reservations",
    severity: "info",
  });

  return { ok: true as const };
}

/** Parent self-service — withdraw a request that is still pending review. */
export async function withdrawMyReservation(supabase: Db, userId: string, id: string, note?: string | null) {
  const { data: reservation } = await supabase
    .from("seat_reservations")
    .select("id, parent_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!reservation || reservation.parent_id !== userId) throw new Error("لم يتم العثور على طلب الحجز.");
  if (reservation.status !== "pending_review") throw new Error("لا يمكن سحب الطلب بعد اتخاذ قرار بشأنه.");

  const { error } = await supabase
    .from("seat_reservations")
    .update({ status: "withdrawn", decision_note: note ?? null })
    .eq("id", id)
    .eq("parent_id", userId);
  if (error) throw new Error("تعذّر سحب طلب الحجز.");

  await logEvent(supabase, id, userId, {
    action: "withdrawn",
    title: "تم سحب طلب الحجز من ولي الأمر",
    body: note ?? null,
  });

  await notify(supabase, {
    roles: STAFF_ROLES,
    kind: "reservation.withdrawn",
    title: "تم سحب طلب حجز مقعد",
    body: note || "قام ولي الأمر بسحب طلب حجز المقعد.",
    link: "/ams/reservations",
    severity: "info",
  });

  return { ok: true as const };
}
