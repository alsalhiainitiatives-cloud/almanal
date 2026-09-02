/**
 * Server-only "Guardian Linking" service.
 *
 * Imported students are owned by the staff member who imported them, so their
 * real guardian has no portal account. This service creates token invitations,
 * tracks their state, and reports which students are already linked to a real
 * guardian account.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { can, type Capability } from "./roles";

type Db = SupabaseClient<Database>;

async function guard(supabase: Db, userId: string, capability: Capability) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!can(roles, capability)) throw new Error("ليس لديك صلاحية إدارة ربط أولياء الأمور.");
  return roles;
}

const STAFF_ROLES = new Set([
  "registration_officer",
  "accountant",
  "principal",
  "supervisor",
  "admin",
  "teacher",
]);

function digits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function tail9(value: string | null | undefined) {
  const d = digits(value);
  return d ? d.slice(-9) : "";
}

function newToken() {
  const raw = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  return raw.slice(0, 40).toLowerCase();
}

type DraftParent = {
  fullName?: string | null;
  mobile?: string | null;
  email?: string | null;
};

export type GuardianLinkRow = {
  childId: string;
  applicationId: string;
  childName: string;
  academicNumber: string | null;
  stageId: string | null;
  classroomId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  parentNationalId: string | null;
  linked: boolean;
  accountName: string | null;
  accountEmail: string | null;
  invitation: {
    id: string;
    token: string;
    status: string;
    expiresAt: string;
    createdAt: string;
    acceptedAt: string | null;
  } | null;
};

export async function listGuardianLinks(supabase: Db, userId: string) {
  await guard(supabase, userId, "view");

  const [{ data: rows, error }, { data: stages }, { data: classrooms }] = await Promise.all([
    supabase
      .from("application_children")
      .select(
        `id, name_ar, stage_id, classroom_id,
         applications!inner ( id, parent_id, status, student_number, application_number,
           parent_national_id, draft_data )`,
      )
      .eq("applications.status", "approved")
      .order("name_ar")
      .limit(800),
    supabase.from("stages").select("id, name_ar").order("sort_order"),
    supabase.from("classrooms").select("id, name_ar, stage_id").order("sort_order"),
  ]);
  if (error) throw new Error("تعذّر تحميل بيانات الربط.");

  type Join = {
    id: string;
    parent_id: string;
    status: string;
    student_number: string | null;
    application_number: string | null;
    parent_national_id: string | null;
    draft_data: Record<string, unknown> | null;
  };

  const list = (rows ?? []).map((row) => ({
    row,
    app: row.applications as unknown as Join,
  }));

  const parentIds = [...new Set(list.map((r) => r.app.parent_id).filter(Boolean))];
  const applicationIds = [...new Set(list.map((r) => r.app.id))];

  const [{ data: profiles }, { data: roles }, { data: invitations }] = await Promise.all([
    parentIds.length
      ? supabase.from("profiles").select("id, full_name, email, phone").in("id", parentIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null; phone: string | null }[] }),
    parentIds.length
      ? supabase.from("user_roles").select("user_id, role").in("user_id", parentIds)
      : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
    applicationIds.length
      ? supabase
          .from("parent_invitations")
          .select("id, application_id, child_id, token, status, expires_at, created_at, accepted_at")
          .in("application_id", applicationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const staffOwners = new Set(
    (roles ?? []).filter((r) => STAFF_ROLES.has(String(r.role))).map((r) => r.user_id),
  );
  const inviteByChild = new Map<string, (typeof invitations)[number]>();
  for (const inv of invitations ?? []) {
    const key = inv.child_id ?? `app:${inv.application_id}`;
    if (!inviteByChild.has(key)) inviteByChild.set(key, inv);
  }

  const students: GuardianLinkRow[] = list.map(({ row, app }) => {
    const draft = (app.draft_data?.parent ?? null) as DraftParent | null;
    const profile = profileById.get(app.parent_id);
    const linked = !staffOwners.has(app.parent_id);
    const invitation =
      inviteByChild.get(row.id) ?? inviteByChild.get(`app:${app.id}`) ?? null;

    return {
      childId: row.id,
      applicationId: app.id,
      childName: row.name_ar,
      academicNumber: app.student_number ?? app.application_number ?? null,
      stageId: row.stage_id,
      classroomId: row.classroom_id,
      parentName: draft?.fullName || (linked ? profile?.full_name : null) || null,
      parentPhone: draft?.mobile || (linked ? profile?.phone : null) || null,
      parentEmail: draft?.email || (linked ? profile?.email : null) || null,
      parentNationalId: app.parent_national_id,
      linked,
      accountName: linked ? (profile?.full_name ?? null) : null,
      accountEmail: linked ? (profile?.email ?? null) : null,
      invitation: invitation
        ? {
            id: invitation.id,
            token: invitation.token,
            status: invitation.status,
            expiresAt: invitation.expires_at,
            createdAt: invitation.created_at,
            acceptedAt: invitation.accepted_at,
          }
        : null,
    };
  });

  // Sibling grouping key so the UI can show "هذا الطفل يشارك ولي أمر مع…".
  const siblingCount = new Map<string, number>();
  for (const s of students) {
    const key = tail9(s.parentPhone);
    if (!key) continue;
    siblingCount.set(key, (siblingCount.get(key) ?? 0) + 1);
  }

  return {
    students: students.map((s) => ({
      ...s,
      siblings: Math.max((siblingCount.get(tail9(s.parentPhone)) ?? 1) - 1, 0),
    })),
    stages: stages ?? [],
    classrooms: classrooms ?? [],
  };
}

/**
 * Creates (or refreshes) invitations for the selected students. Children that
 * share the guardian phone are still given their own row, but a single claim
 * links every one of them at once.
 */
export async function createGuardianInvitations(
  supabase: Db,
  userId: string,
  input: {
    childIds: string[];
    overrides?: Record<string, { name?: string | null; phone?: string | null; email?: string | null }>;
  },
) {
  await guard(supabase, userId, "seats");
  if (!input.childIds.length) throw new Error("لم يتم تحديد أي طالب.");
  if (input.childIds.length > 200) throw new Error("الحد الأقصى 200 دعوة في المرة الواحدة.");

  const { data: rows, error } = await supabase
    .from("application_children")
    .select("id, name_ar, application_id, applications!inner ( id, parent_national_id, draft_data )")
    .in("id", input.childIds);
  if (error) throw new Error("تعذّر قراءة بيانات الطلاب.");

  const created: {
    childId: string;
    childName: string;
    parentName: string | null;
    parentPhone: string;
    token: string;
  }[] = [];
  const skipped: { childName: string; reason: string }[] = [];

  for (const row of rows ?? []) {
    const app = row.applications as unknown as {
      id: string;
      parent_national_id: string | null;
      draft_data: Record<string, unknown> | null;
    };
    const draft = (app.draft_data?.parent ?? null) as DraftParent | null;
    const override = input.overrides?.[row.id];
    const phone = (override?.phone ?? draft?.mobile ?? "").trim();
    if (digits(phone).length < 9) {
      skipped.push({ childName: row.name_ar, reason: "رقم جوال ولي الأمر غير مكتمل" });
      continue;
    }
    const name = (override?.name ?? draft?.fullName ?? "").trim() || null;
    const email = (override?.email ?? draft?.email ?? "").trim() || null;
    const token = newToken();

    // One live invitation per child.
    await supabase
      .from("parent_invitations")
      .delete()
      .eq("child_id", row.id)
      .neq("status", "accepted");

    const { error: insertError } = await supabase.from("parent_invitations").insert({
      application_id: app.id,
      child_id: row.id,
      parent_name: name,
      parent_phone: phone,
      parent_email: email,
      parent_national_id: app.parent_national_id,
      token,
      created_by: userId,
    });
    if (insertError) {
      skipped.push({ childName: row.name_ar, reason: "تعذّر إنشاء الدعوة" });
      continue;
    }
    created.push({ childId: row.id, childName: row.name_ar, parentName: name, parentPhone: phone, token });
  }

  return { created, skipped };
}

export async function revokeGuardianInvitation(supabase: Db, userId: string, input: { id: string }) {
  await guard(supabase, userId, "seats");
  const { error } = await supabase
    .from("parent_invitations")
    .update({ status: "revoked" })
    .eq("id", input.id)
    .neq("status", "accepted");
  if (error) throw new Error("تعذّر إلغاء الدعوة.");
  return { ok: true as const };
}

/** Signed-in guardian claims an invitation; siblings link automatically. */
export async function claimInvitation(supabase: Db, token: string) {
  const { data, error } = await supabase.rpc("claim_parent_invitation", { _token: token });
  if (error) {
    const map: Record<string, string> = {
      invitation_not_found: "رابط الدعوة غير صحيح.",
      invitation_revoked: "تم إلغاء هذه الدعوة، تواصل مع إدارة المدرسة.",
      invitation_expired: "انتهت صلاحية رابط الدعوة، اطلب رابطًا جديدًا من المدرسة.",
    };
    const key = Object.keys(map).find((k) => error.message.includes(k));
    throw new Error(key ? map[key] : "تعذّر إتمام الربط، حاول مرة أخرى.");
  }
  const row = (data ?? [])[0] as { linked: number; child_names: string[] } | undefined;
  return { linked: row?.linked ?? 0, childNames: row?.child_names ?? [] };
}
