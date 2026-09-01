/**
 * Server-only service for the "Class Chat" module.
 *
 * Every query runs as the signed-in user, so row-level security decides which
 * rooms and messages are reachable. The service-role client is used strictly to
 * sign attachment URLs stored in the private `classroom-media` bucket.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import {
  CHAT_BUCKET,
  type ChatAttachment,
  type ChatBoard,
  type ChatMessage,
  type ChatRoom,
} from "./chat";

type Db = SupabaseClient<Database>;

const STAFF_ROLES: AppRole[] = [
  "registration_officer",
  "accountant",
  "principal",
  "supervisor",
  "admin",
];

async function rolesOf(supabase: Db, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(CHAT_BUCKET).createSignedUrls(unique, 60 * 60 * 6);
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  return map;
}

type RoomSeed = { classroomId: string; childName: string | null };

async function roomSeeds(
  supabase: Db,
  userId: string,
  role: ChatBoard["role"],
): Promise<RoomSeed[]> {
  if (role === "staff") {
    const { data } = await supabase
      .from("classrooms")
      .select("id")
      .eq("is_active", true)
      .order("sort_order")
      .limit(200);
    return (data ?? []).map((c) => ({ classroomId: c.id, childName: null }));
  }
  if (role === "teacher") {
    const { data } = await supabase
      .from("teacher_classrooms")
      .select("classroom_id")
      .eq("teacher_id", userId);
    return [...new Set((data ?? []).map((r) => r.classroom_id).filter(Boolean))].map((id) => ({
      classroomId: id as string,
      childName: null,
    }));
  }
  const { data } = await supabase
    .from("application_children")
    .select("name_ar, classroom_id, applications!inner (parent_id, status)")
    .eq("applications.parent_id", userId)
    .eq("applications.status", "approved")
    .order("name_ar")
    .limit(50);
  return (data ?? [])
    .filter((r) => Boolean(r.classroom_id))
    .map((r) => ({ classroomId: r.classroom_id as string, childName: r.name_ar }));
}

function normalizeAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
    .slice(0, 6)
    .map((a) => ({
      kind: (a['kind'] as ChatAttachment["kind"]) ?? "file",
      path: (a['path'] as string | null) ?? null,
      url: (a['url'] as string | null) ?? null,
      name: (a['name'] as string | null) ?? null,
      size: (a['size'] as number | null) ?? null,
    }));
}

/** Rooms the caller may reach, plus the message feed of the active room. */
export async function getChatBoard(
  supabase: Db,
  userId: string,
  input: { classroomId?: string | null },
): Promise<ChatBoard> {
  const roles = await rolesOf(supabase, userId);
  const role: ChatBoard["role"] = roles.some((r) => STAFF_ROLES.includes(r))
    ? "staff"
    : roles.includes("teacher")
      ? "teacher"
      : "parent";

  const seeds = await roomSeeds(supabase, userId, role);
  let ids = [...new Set(seeds.map((s) => s.classroomId))];

  // Settings toggles: the chat can be switched off globally or per classroom.
  // School administration keeps its master view for moderation.
  if (role !== "staff" && ids.length) {
    const { data: setting } = await supabase
      .from("academics_settings")
      .select("value")
      .eq("key", "chat")
      .maybeSingle();
    const globalEnabled = ((setting?.value ?? {}) as Record<string, unknown>)["enabled"] !== false;
    if (!globalEnabled) {
      ids = [];
    } else {
      const { data: flags } = await supabase
        .from("classrooms")
        .select("id, chat_enabled")
        .in("id", ids);
      const disabled = new Set(
        (flags ?? []).filter((c) => c.chat_enabled === false).map((c) => c.id),
      );
      ids = ids.filter((id) => !disabled.has(id));
    }
  }


  let rooms: ChatRoom[] = [];
  if (ids.length) {
    const [{ data: classrooms }, { data: links }] = await Promise.all([
      supabase
        .from("classrooms")
        .select("id, name_ar, color_hex, teacher_name, sort_order, stages (name_ar)")
        .in("id", ids)
        .order("sort_order"),
      supabase.from("teacher_classrooms").select("classroom_id, teacher_id").in("classroom_id", ids),
    ]);

    const teacherIds = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))];
    const { data: profiles } = teacherIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", teacherIds)
      : { data: [] as { id: string; full_name: string }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const byRoom = new Map<string, string[]>();
    for (const link of links ?? []) {
      const name = nameById.get(link.teacher_id);
      if (!link.classroom_id || !name) continue;
      byRoom.set(link.classroom_id, [...(byRoom.get(link.classroom_id) ?? []), name]);
    }

    const childByRoom = new Map(seeds.map((s) => [s.classroomId, s.childName]));
    rooms = ((classrooms ?? []) as unknown as {
      id: string;
      name_ar: string;
      color_hex: string;
      teacher_name: string | null;
      stages: { name_ar: string } | null;
    }[]).map((c) => ({
      classroomId: c.id,
      classroomName: c.name_ar,
      stageName: c.stages?.name_ar ?? null,
      colorHex: c.color_hex,
      childName: childByRoom.get(c.id) ?? null,
      teacherNames: byRoom.get(c.id) ?? (c.teacher_name ? [c.teacher_name] : []),
    }));
  }

  const activeRoomId =
    input.classroomId && rooms.some((r) => r.classroomId === input.classroomId)
      ? input.classroomId
      : (rooms[0]?.classroomId ?? null);

  if (!activeRoomId) return { role, rooms, activeRoomId: null, messages: [] };

  const { data: rows } = await supabase
    .from("classroom_messages")
    .select(
      "id, classroom_id, parent_message_id, sender_id, sender_name, sender_role, body, attachments, deleted_at, created_at",
    )
    .eq("classroom_id", activeRoomId)
    .order("created_at", { ascending: false })
    .limit(200);

  const ordered = [...(rows ?? [])].reverse();
  const paths = ordered.flatMap((r) =>
    normalizeAttachments(r.attachments)
      .map((a) => a.path)
      .filter((p): p is string => Boolean(p)),
  );
  const signed = await signPaths(paths);

  const messages: ChatMessage[] = ordered.map((r) => ({
    id: r.id,
    classroomId: r.classroom_id,
    parentMessageId: r.parent_message_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    senderRole: r.sender_role,
    body: r.deleted_at ? "" : r.body,
    attachments: r.deleted_at
      ? []
      : normalizeAttachments(r.attachments).map((a) => ({
          ...a,
          url: a.path ? (signed[a.path] ?? null) : a.url,
        })),
    createdAt: r.created_at,
    deleted: Boolean(r.deleted_at),
    mine: r.sender_id === userId,
  }));

  return { role, rooms, activeRoomId, messages };
}

export type SendMessageInput = {
  classroomId: string;
  body: string;
  parentMessageId?: string | null;
  attachments?: ChatAttachment[];
};

/** Posts a message into a classroom room; RLS rejects rooms the user can't reach. */
export async function sendChatMessage(supabase: Db, userId: string, input: SendMessageInput) {
  const roles = await rolesOf(supabase, userId);
  const senderRole = roles.some((r) => STAFF_ROLES.includes(r))
    ? "staff"
    : roles.includes("teacher")
      ? "teacher"
      : "parent";

  const body = input.body.trim();
  const attachments = (input.attachments ?? []).slice(0, 6);
  if (!body && !attachments.length) throw new Error("لا يمكن إرسال رسالة فارغة.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("classroom_messages")
    .insert({
      classroom_id: input.classroomId,
      parent_message_id: input.parentMessageId ?? null,
      sender_id: userId,
      sender_name: profile?.full_name ?? null,
      sender_role: senderRole,
      body,
      attachments: attachments as never,
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error("تعذّر إرسال الرسالة — تأكد من صلاحيتك على هذا الفصل.");

  // Fan out an internal notification so the header bell + tab badges light up.
  try {
    const { classroomAudience, notify } = await import(
      "@/features/notifications/notifications.server"
    );
    const { data: classroom } = await supabase
      .from("classrooms")
      .select("name_ar")
      .eq("id", input.classroomId)
      .maybeSingle();
    const { parentIds, teacherIds } = await classroomAudience(input.classroomId);
    const senderName = profile?.full_name ?? "أحد أعضاء الفصل";
    const preview = body ? body.slice(0, 120) : "مرفق جديد في المحادثة";
    const title = `رسالة جديدة في ${classroom?.name_ar ?? "محادثة الفصل"}`;

    await Promise.all([
      notify(supabase, {
        userIds: parentIds,
        kind: "chat_message",
        title,
        body: `${senderName}: ${preview}`,
        link: "/class-chat",
        severity: "info",
      }),
      notify(supabase, {
        userIds: teacherIds,
        kind: "chat_message",
        title,
        body: `${senderName}: ${preview}`,
        link: "/ams/academics/chat",
        severity: "info",
      }),
    ]);
  } catch (notifyError) {
    console.error("chat notify failed", notifyError);
  }

  return { id: data?.id ?? null };
}


/** Removes a message: authors soft-delete their own, staff hard-delete for moderation. */
export async function deleteChatMessage(supabase: Db, userId: string, id: string) {
  const roles = await rolesOf(supabase, userId);
  const staff = roles.some((r) => STAFF_ROLES.includes(r));

  const { data: row } = await supabase
    .from("classroom_messages")
    .select("sender_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("الرسالة غير موجودة.");

  if (row.sender_id === userId) {
    const { error } = await supabase
      .from("classroom_messages")
      .update({ deleted_at: new Date().toISOString(), body: "", attachments: [] as never })
      .eq("id", id)
      .eq("sender_id", userId);
    if (error) throw new Error("تعذّر حذف الرسالة.");
    return { ok: true };
  }

  if (!staff) throw new Error("لا يمكنك حذف رسالة غيرك.");
  const { error } = await supabase.from("classroom_messages").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الرسالة.");
  return { ok: true };
}
