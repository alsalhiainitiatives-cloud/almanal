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
    .select("id, teacher_id, parent_id, child_id, updated_at")
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

  type Peer = {
    key: string;
    peerId: string | null;
    childId: string | null;
    subtitle: string | null;
    childIds: string[];
    /** Child's name — shown instead of the guardian's own name. */
    displayName: string | null;
    chatId: string | null;
  };
  let peers: Peer[] = [];

  if (role === "parent") {
    const { data: links } = await supabaseAdmin
      .from("teacher_classrooms")
      .select("teacher_id")
      .eq("classroom_id", input.classroomId);
    peers = [...new Set((links ?? []).map((l) => l.teacher_id).filter(Boolean))].map((id) => ({
      key: id as string,
      peerId: id as string,
      childId: null,
      subtitle: "معلمة الفصل",
      childIds: [],
      displayName: null,
      // A chat created by the teacher before the guardian was linked is keyed by the child.
      chatId: chatRows.find((c) => c.teacher_id === id)?.id ?? null,
    }));
  } else {
    // Teachers and school staff both see every child of the classroom, so a
    // conversation can be started (teachers) or reviewed (staff) by child name.
    const { data: children } = await supabaseAdmin
      .from("application_children")
      .select("id, name_ar, applications!inner (parent_id, status)")
      .eq("classroom_id", input.classroomId)
      .eq("applications.status", "approved")
      .is("withdrawn_at", null)
      .order("name_ar", { ascending: true })
      .limit(400);

    const rows = (children ?? []) as unknown as {
      id: string;
      name_ar: string;
      applications: { parent_id: string | null } | null;
    }[];

    const guardianIds = [
      ...new Set(rows.map((r) => r.applications?.parent_id).filter((v): v is string => Boolean(v))),
    ];
    const { data: guardianProfiles } = guardianIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", guardianIds)
      : { data: [] as { id: string; full_name: string }[] };
    const guardianName = new Map((guardianProfiles ?? []).map((p) => [p.id, p.full_name]));

    peers = rows.map((row) => {
      const parentId = row.applications?.parent_id ?? null;
      const chatId =
        chatRows.find((c) => c.child_id === row.id)?.id ??
        (parentId
          ? (chatRows.find((c) => !c.child_id && c.parent_id === parentId)?.id ?? null)
          : null);
      return {
        key: row.id,
        peerId: parentId,
        childId: row.id,
        subtitle: parentId
          ? `ولي الأمر: ${guardianName.get(parentId)?.trim() || "ولي الأمر"}`
          : "لم يُربط ولي الأمر بعد — الرسائل ستظهر له فور الربط",
        childIds: [row.id],
        displayName: row.name_ar,
        chatId,
      };
    });
  }


  const peerIds = [...new Set(peers.map((p) => p.peerId).filter((v): v is string => Boolean(v)))];
  const { data: profiles } = peerIds.length
    ? await supabaseAdmin.from("profiles").select("id, full_name, avatar_url").in("id", peerIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const signed = await signPaths(
    (profiles ?? [])
      .map((p) => p.avatar_url)
      .filter((v): v is string => Boolean(v) && !/^(https?:|data:)/i.test(v!)),
  );

  const contacts: PrivateContact[] = peers.map((p) => {
    const last = p.chatId ? lastByChat.get(p.chatId) : null;
    const profile = p.peerId ? profileById.get(p.peerId) : null;
    return {
      key: p.key,
      peerId: p.peerId,
      childId: p.childId,
      // Guardians are always presented by their child's name.
      name: p.displayName ?? (profile?.full_name?.trim() || "عضو"),
      avatarUrl: resolveAvatar(profile?.avatar_url ?? null, signed),
      subtitle: p.subtitle,
      childIds: p.childIds,
      chatId: p.chatId,
      lastMessageAt: last?.at ?? null,
      lastPreview: last?.preview ?? null,
    };
  });

  contacts.sort((a, b) => {
    const at = (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
    if (at !== 0) return at;
    return a.name.localeCompare(b.name, "ar");
  });

  return { role, readOnly: role === "staff", contacts };
}


async function loadMessages(
  supabase: Db,
  userId: string,
  chatId: string,
  /** Guardian id → child name, so a guardian's messages carry the child's name. */
  childNameByParent?: Map<string, string>,
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
    senderName:
      childNameByParent?.get(r.sender_id) ?? profileById.get(r.sender_id)?.full_name ?? null,

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

/** Opens (creating on first use) the private thread about one child / with one peer. */
export async function openPrivateThread(
  supabase: Db,
  userId: string,
  input: {
    classroomId: string;
    peerId?: string | null;
    childId?: string | null;
    chatId?: string | null;
  },
): Promise<PrivateThread> {
  const role = await roleOf(supabase, userId);
  await assertClassroomAccess(supabase, userId, input.classroomId);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let chatId = input.chatId ?? null;
  let peerId = input.peerId ?? null;
  let childId = input.childId ?? null;
  let childName: string | null = null;

  if (!chatId) {
    if (role === "staff") throw new Error("الإدارة تطّلع على المحادثات القائمة فقط.");

    if (role === "teacher") {
      if (!childId) throw new Error("يرجى اختيار الطفل المراد محادثة ولي أمره.");

      // The child must belong to this classroom; its guardian may not exist yet.
      const { data: child } = await supabaseAdmin
        .from("application_children")
        .select("id, name_ar, classroom_id, applications!inner (parent_id)")
        .eq("id", childId)
        .maybeSingle();
      const row = child as unknown as {
        id: string;
        name_ar: string;
        classroom_id: string | null;
        applications: { parent_id: string | null } | null;
      } | null;
      if (!row || row.classroom_id !== input.classroomId) {
        throw new Error("هذا الطفل غير مسجّل في هذا الفصل.");
      }
      childName = row.name_ar;
      peerId = row.applications?.parent_id ?? null;

      const { data: byChild } = await supabase
        .from("private_chats")
        .select("id")
        .eq("class_id", input.classroomId)
        .eq("teacher_id", userId)
        .eq("child_id", childId)
        .maybeSingle();

      if (byChild?.id) {
        chatId = byChild.id;
      } else {
        // Adopt a legacy conversation opened with the guardian before children were keyed.
        const legacy = peerId
          ? await supabase
              .from("private_chats")
              .select("id")
              .eq("class_id", input.classroomId)
              .eq("teacher_id", userId)
              .eq("parent_id", peerId)
              .is("child_id", null)
              .maybeSingle()
          : { data: null };

        if (legacy.data?.id) {
          chatId = legacy.data.id;
          await supabase.from("private_chats").update({ child_id: childId }).eq("id", chatId);
        } else {
          const { data: created, error } = await supabase
            .from("private_chats")
            .insert({
              class_id: input.classroomId,
              teacher_id: userId,
              parent_id: peerId,
              child_id: childId,
            })
            .select("id")
            .maybeSingle();
          if (error || !created?.id) {
            throw new Error("تعذّر بدء المحادثة الخاصة — تأكدي من إسنادك لهذا الفصل.");
          }
          chatId = created.id;
        }
      }
    } else {
      if (!peerId) throw new Error("يرجى اختيار الشخص المراد محادثته.");

      // A conversation the teacher may already have started about one of my children.
      const { data: mine } = await supabase
        .from("private_chats")
        .select("id, parent_id")
        .eq("class_id", input.classroomId)
        .eq("teacher_id", peerId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (mine?.[0]?.id) {
        chatId = mine[0].id;
      } else {
        const { data: created, error } = await supabase
          .from("private_chats")
          .insert({ class_id: input.classroomId, teacher_id: peerId, parent_id: userId })
          .select("id")
          .maybeSingle();
        if (error || !created?.id) {
          throw new Error("تعذّر بدء المحادثة الخاصة — تأكد من ارتباطك بهذا الفصل.");
        }
        chatId = created.id;
      }
    }
  }

  const { data: chat } = await supabase
    .from("private_chats")
    .select("id, teacher_id, parent_id, child_id")
    .eq("id", chatId)
    .maybeSingle();
  if (!chat) throw new Error("المحادثة غير متاحة.");

  childId = chat.child_id ?? childId;

  // A guardian linked after the conversation started becomes its owner now.
  if (!chat.parent_id && chat.child_id) {
    const { data: link } = await supabaseAdmin
      .from("application_children")
      .select("name_ar, applications!inner (parent_id)")
      .eq("id", chat.child_id)
      .maybeSingle();
    const linked = link as unknown as {
      name_ar: string;
      applications: { parent_id: string | null } | null;
    } | null;
    childName = childName ?? linked?.name_ar ?? null;
    const guardianId = linked?.applications?.parent_id ?? null;
    if (guardianId) {
      await supabaseAdmin.from("private_chats").update({ parent_id: guardianId }).eq("id", chat.id);
      if (chat.teacher_id === userId) peerId = guardianId;
    }
  }

  if (!peerId) peerId = chat.teacher_id === userId ? chat.parent_id : chat.teacher_id;

  const { data: profile } = peerId
    ? await supabaseAdmin
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", peerId)
        .maybeSingle()
    : { data: null };
  const signed = await signPaths(
    profile?.avatar_url && !/^(https?:|data:)/i.test(profile.avatar_url)
      ? [profile.avatar_url]
      : [],
  );

  // Guardians appear everywhere under their child's name.
  const { childNamesByParent } = await import("./chat.server");
  const childNames = await childNamesByParent(input.classroomId);
  if (!childName && chat.child_id) {
    const { data: named } = await supabaseAdmin
      .from("application_children")
      .select("name_ar")
      .eq("id", chat.child_id)
      .maybeSingle();
    childName = named?.name_ar ?? null;
  }
  const peerChildName =
    chat.teacher_id === userId
      ? (childName ?? (peerId ? (childNames.get(peerId) ?? null) : null))
      : null;

  return {
    chatId: chat.id,
    peerId,
    peerName: peerChildName ?? profile?.full_name?.trim() ?? "عضو",
    peerAvatarUrl: resolveAvatar(profile?.avatar_url ?? null, signed),
    awaitingGuardian: chat.teacher_id === userId && !chat.parent_id,
    readOnly: role === "staff",
    messages: await loadMessages(supabase, userId, chat.id, childNames),
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
    .select("id, class_id, teacher_id, parent_id, child_id")
    .eq("id", input.chatId)
    .maybeSingle();
  if (!chat) throw new Error("المحادثة غير متاحة.");

  let guardianId = chat.parent_id;
  if (chat.teacher_id !== userId && guardianId !== userId) {
    // A guardian linked to the child after the teacher started the conversation.
    const { data: isParent } = chat.child_id
      ? await supabase.rpc("is_child_parent", { _user_id: userId, _child_id: chat.child_id })
      : { data: false };
    if (isParent !== true) throw new Error("لا يمكنك المشاركة في هذه المحادثة.");
    guardianId = userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!chat.parent_id) {
      await supabaseAdmin.from("private_chats").update({ parent_id: userId }).eq("id", chat.id);
    }
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
    const { childNamesByParent } = await import("./chat.server");
    const senderLabel =
      guardianId === userId
        ? ((await childNamesByParent(chat.class_id)).get(userId) ?? profile?.full_name ?? null)
        : (profile?.full_name ?? null);
    const recipient = chat.teacher_id === userId ? guardianId : chat.teacher_id;

    // No guardian linked yet: the message waits in the conversation until there is one.
    if (recipient) {
      await notify(supabase, {
        userIds: [recipient],
        kind: "chat_message",
        title: "رسالة خاصة جديدة",
        body: `${senderLabel ?? "أحد أعضاء الفصل"}: ${text ? text.slice(0, 120) : "مرفق جديد"}`,
        link: chat.teacher_id === recipient ? "/ams/academics/chat" : "/class-chat",
        severity: "info",
      });
    }

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
