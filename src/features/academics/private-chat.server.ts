/**
 * Server-only service for private 1-on-1 chats (teacher ⇄ parent).
 *
 * Access is decided by the database: every read/write of `private_chats` and
 * `private_messages` runs as the signed-in user, and the RLS policies allow a
 * parent only teachers assigned to her child's classroom (and vice versa).
 * The service-role client is used strictly for two things that RLS hides from
 * the caller by design: signing private attachment URLs, and reading the
 * directory of teachers / parents of a classroom the caller is already allowed
 * to reach (verified first through `can_read_classroom_curriculum`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { CHAT_BUCKET } from "./chat";
import {
  PRIVATE_CHAT_FOLDER,
  type PrivateAttachmentKind,
  type PrivateContact,
  type PrivateContactList,
  type PrivateMessage,
  type PrivateThread,
} from "./private-chat";

type Db = SupabaseClient<Database>;

const STAFF_ROLES: AppRole[] = [
  "registration_officer",
  "accountant",
  "principal",
  "supervisor",
  "admin",
];

async function roleOf(supabase: Db, userId: string): Promise<PrivateContactList["role"]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (roles.some((r) => STAFF_ROLES.includes(r))) return "staff";
  if (roles.includes("teacher")) return "teacher";
  return "parent";
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from(CHAT_BUCKET)
    .createSignedUrls(unique, 60 * 60 * 6);
  const map: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  return map;
}

function resolveAvatar(raw: string | null, signed: Record<string, string>): string | null {
  if (!raw) return null;
  return /^(https?:|data:)/i.test(raw) ? raw : (signed[raw] ?? null);
}

/** Throws unless the caller may reach the classroom (staff, its teacher, or a parent of a child in it). */
async function assertClassroomAccess(supabase: Db, userId: string, classroomId: string) {
  const { data, error } = await supabase.rpc("can_read_classroom_curriculum", {
    _user_id: userId,
    _classroom_id: classroomId,
  });
  if (error || data !== true) throw new Error("لا تملك صلاحية على هذا الفصل.");
}

/** People the caller may open a private conversation with, inside one classroom. */
export async function listPrivateContacts(
  supabase: Db,
  userId: string,
  input: { classroomId: string },
): Promise<PrivateContactList> {
  const role = await roleOf(supabase, userId);
  await assertClassroomAccess(supabase, userId, input.classroomId);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Existing chats of this classroom that involve the caller (staff sees all).
  const { data: chats } = await supabase
    .from("private_chats")
    .select("id, teacher_id, parent_id, updated_at")
    .eq("class_id", input.classroomId)
    .order("updated_at", { ascending: false })
    .limit(300);

  const chatRows = chats ?? [];
  const chatIds = chatRows.map((c) => c.id);
  const { data: lastMessages } = chatIds.length
    ? await supabase
        .from("private_messages")
        .select("chat_id, text, attachment_type, created_at, deleted_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: false })
        .limit(600)
    : { data: [] as { chat_id: string; text: string; attachment_type: string | null; created_at: string; deleted_at: string | null }[] };

  const lastByChat = new Map<string, { at: string; preview: string }>();
  for (const m of lastMessages ?? []) {
    if (lastByChat.has(m.chat_id)) continue;
    lastByChat.set(m.chat_id, {
      at: m.created_at,
      preview: m.deleted_at ? "رسالة محذوفة" : m.text || (m.attachment_type ? "مرفق" : ""),
    });
  }

  let peers: { peerId: string; subtitle: string | null }[] = [];

  if (role === "parent") {
    const { data: links } = await supabaseAdmin
      .from("teacher_classrooms")
      .select("teacher_id")
      .eq("classroom_id", input.classroomId);
    peers = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))].map((id) => ({
      peerId: id as string,
      subtitle: "معلمة الفصل",
    }));
  } else if (role === "teacher") {
    const { data: children } = await supabaseAdmin
      .from("application_children")
      .select("name_ar, applications!inner (parent_id, status)")
      .eq("classroom_id", input.classroomId)
      .eq("applications.status", "approved")
      .limit(300);
    const byParent = new Map<string, string[]>();
    for (const row of (children ?? []) as unknown as {
      name_ar: string;
      applications: { parent_id: string | null } | null;
    }[]) {
      const parentId = row.applications?.parent_id;
      if (!parentId) continue;
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), row.name_ar]);
    }
    peers = [...byParent.entries()].map(([peerId, names]) => ({
      peerId,
      subtitle: `ولي أمر ${names.slice(0, 2).join(" و")}`,
    }));
  } else {
    // Staff moderation: only conversations that already exist.
    peers = chatRows.map((c) => ({ peerId: c.teacher_id, subtitle: "محادثة خاصة" }));
  }

  const peerIds = [...new Set(peers.map((p) => p.peerId))];
  const { data: profiles } = peerIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, avatar_url").in("id", peerIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const signed = await signPaths(
    (profiles ?? [])
      .map((p) => p.avatar_url)
      .filter((v): v is string => Boolean(v) && !/^(https?:|data:)/i.test(v!)),
  );

  const chatByPeer = new Map<string, string>();
  for (const c of chatRows) {
    if (role === "parent" && c.parent_id === userId) chatByPeer.set(c.teacher_id, c.id);
    else if (role === "teacher" && c.teacher_id === userId) chatByPeer.set(c.parent_id, c.id);
    else if (role === "staff") chatByPeer.set(c.teacher_id, c.id);
  }

  const contacts: PrivateContact[] = peers.map((p) => {
    const chatId = chatByPeer.get(p.peerId) ?? null;
    const last = chatId ? lastByChat.get(chatId) : null;
    const profile = profileById.get(p.peerId);
    return {
      peerId: p.peerId,
      name: profile?.full_name?.trim() || "عضو",
      avatarUrl: resolveAvatar(profile?.avatar_url ?? null, signed),
      subtitle: p.subtitle,
      chatId,
      lastMessageAt: last?.at ?? null,
      lastPreview: last?.preview ?? null,
    };
  });

  contacts.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));

  return { role, readOnly: role === "staff", contacts };
}

async function loadMessages(
  supabase: Db,
  userId: string,
  chatId: string,
): Promise<PrivateMessage[]> {
  const { data: rows } = await supabase
    .from("private_messages")
    .select(
      "id, chat_id, sender_id, text, attachment_url, attachment_type, attachment_name, deleted_at, created_at",
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(200);

  const ordered = [...(rows ?? [])].reverse();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const senderIds = [...new Set(ordered.map((r) => r.sender_id))];
  const { data: profiles } = senderIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, avatar_url").in("id", senderIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const attachmentPaths = ordered
    .map((r) => r.attachment_url)
    .filter((v): v is string => Boolean(v) && !/^https?:/i.test(v!));
  const avatarPaths = (profiles ?? [])
    .map((p) => p.avatar_url)
    .filter((v): v is string => Boolean(v) && !/^(https?:|data:)/i.test(v!));
  const signed = await signPaths([...attachmentPaths, ...avatarPaths]);

  return ordered.map((r) => ({
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    senderName: profileById.get(r.sender_id)?.full_name ?? null,
    senderAvatarUrl: resolveAvatar(profileById.get(r.sender_id)?.avatar_url ?? null, signed),
    text: r.deleted_at ? "" : r.text,
    attachmentUrl: r.deleted_at
      ? null
      : r.attachment_url
        ? /^https?:/i.test(r.attachment_url)
          ? r.attachment_url
          : (signed[r.attachment_url] ?? null)
        : null,
    attachmentType: r.deleted_at ? null : ((r.attachment_type as PrivateAttachmentKind | null) ?? null),
    attachmentName: r.deleted_at ? null : r.attachment_name,
    createdAt: r.created_at,
    deleted: Boolean(r.deleted_at),
    mine: r.sender_id === userId,
  }));
}

/** Opens (creating on first use) the private thread between the caller and one peer. */
export async function openPrivateThread(
  supabase: Db,
  userId: string,
  input: { classroomId: string; peerId?: string | null; chatId?: string | null },
): Promise<PrivateThread> {
  const role = await roleOf(supabase, userId);
  await assertClassroomAccess(supabase, userId, input.classroomId);

  let chatId = input.chatId ?? null;
  let peerId = input.peerId ?? null;

  if (!chatId) {
    if (!peerId) throw new Error("يرجى اختيار الشخص المراد محادثته.");
    if (role === "staff") throw new Error("الإدارة تطّلع على المحادثات القائمة فقط.");

    const teacherId = role === "teacher" ? userId : peerId;
    const parentId = role === "teacher" ? peerId : userId;

    const { data: existing } = await supabase
      .from("private_chats")
      .select("id")
      .eq("class_id", input.classroomId)
      .eq("teacher_id", teacherId)
      .eq("parent_id", parentId)
      .maybeSingle();

    if (existing?.id) {
      chatId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("private_chats")
        .insert({ class_id: input.classroomId, teacher_id: teacherId, parent_id: parentId })
        .select("id")
        .maybeSingle();
      if (error || !created?.id) {
        throw new Error("تعذّر بدء المحادثة الخاصة — تأكد من ارتباطك بهذا الفصل.");
      }
      chatId = created.id;
    }
  }

  const { data: chat } = await supabase
    .from("private_chats")
    .select("id, teacher_id, parent_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) throw new Error("المحادثة غير متاحة.");

  if (!peerId) peerId = chat.teacher_id === userId ? chat.parent_id : chat.teacher_id;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", peerId)
    .maybeSingle();
  const signed = await signPaths(
    profile?.avatar_url && !/^(https?:|data:)/i.test(profile.avatar_url)
      ? [profile.avatar_url]
      : [],
  );

  return {
    chatId: chat.id,
    peerId,
    peerName: profile?.full_name?.trim() || "عضو",
    peerAvatarUrl: resolveAvatar(profile?.avatar_url ?? null, signed),
    readOnly: role === "staff",
    messages: await loadMessages(supabase, userId, chat.id),
  };
}

export type SendPrivateInput = {
  chatId: string;
  text: string;
  attachmentUrl?: string | null;
  attachmentType?: PrivateAttachmentKind | null;
  attachmentName?: string | null;
};

/** Sends a private message and notifies the other side. */
export async function sendPrivateMessage(supabase: Db, userId: string, input: SendPrivateInput) {
  const text = input.text.trim();
  if (!text && !input.attachmentUrl) throw new Error("لا يمكن إرسال رسالة فارغة.");

  const { data: chat } = await supabase
    .from("private_chats")
    .select("id, class_id, teacher_id, parent_id")
    .eq("id", input.chatId)
    .maybeSingle();
  if (!chat) throw new Error("المحادثة غير متاحة.");
  if (chat.teacher_id !== userId && chat.parent_id !== userId) {
    throw new Error("لا يمكنك المشاركة في هذه المحادثة.");
  }

  const { error } = await supabase.from("private_messages").insert({
    chat_id: chat.id,
    sender_id: userId,
    text,
    attachment_url: input.attachmentUrl ?? null,
    attachment_type: input.attachmentType ?? null,
    attachment_name: input.attachmentName ?? null,
  });
  if (error) throw new Error("تعذّر إرسال الرسالة الخاصة.");

  await supabase
    .from("private_chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chat.id);

  try {
    const { notify } = await import("@/features/notifications/notifications.server");
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const recipient = chat.teacher_id === userId ? chat.parent_id : chat.teacher_id;
    await notify(supabase, {
      userIds: [recipient],
      kind: "chat_message",
      title: "رسالة خاصة جديدة",
      body: `${profile?.full_name ?? "أحد أعضاء الفصل"}: ${text ? text.slice(0, 120) : "مرفق جديد"}`,
      link: chat.teacher_id === recipient ? "/ams/academics/chat" : "/class-chat",
      severity: "info",
    });
  } catch (notifyError) {
    console.error("private chat notify failed", notifyError);
  }

  return { ok: true };
}

/** Senders soft-delete their own message; school administration removes it entirely. */
export async function deletePrivateMessage(supabase: Db, userId: string, id: string) {
  const { data: row } = await supabase
    .from("private_messages")
    .select("id, sender_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("الرسالة غير موجودة.");

  if (row.sender_id === userId) {
    const { error } = await supabase
      .from("private_messages")
      .update({ deleted_at: new Date().toISOString(), text: "" })
      .eq("id", id);
    if (error) throw new Error("تعذّر حذف الرسالة.");
    return { ok: true };
  }

  const role = await roleOf(supabase, userId);
  if (role !== "staff") throw new Error("لا يمكنك حذف رسالة غيرك.");
  const { error } = await supabase.from("private_messages").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الرسالة.");
  return { ok: true };
}

export { PRIVATE_CHAT_FOLDER };
