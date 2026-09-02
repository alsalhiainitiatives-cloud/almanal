/**
 * Server-only service for "Storage & Maintenance".
 *
 * Every entry point re-checks that the caller is school administration
 * (SuperAdmin / Manager) before counting or deleting anything. Storage objects
 * are removed with the service-role client because the buckets are private.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";
import { ASSESSMENT_BUCKET } from "./assessments";
import { CHAT_BUCKET } from "./chat";
import {
  RETENTION_DAYS,
  canManageStorage,
  type ChatWipePreview,
  type ChatWipeScope,
  type EvidencePreview,
  type MaintenanceBoard,
  type RetentionWindow,
} from "./maintenance";

type Db = SupabaseClient<Database>;

async function assertManager(supabase: Db, userId: string): Promise<void> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!canManageStorage(roles)) {
    throw new Error("هذه الأدوات متاحة لمدير النظام ومدير المدرسة فقط.");
  }
}

function cutoffOf(window: RetentionWindow): string {
  const days = RETENTION_DAYS[window];
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getMaintenanceBoard(supabase: Db, userId: string): Promise<MaintenanceBoard> {
  await assertManager(supabase, userId);

  const [{ data: classrooms }, { data: stages }, evidence, messages] = await Promise.all([
    supabase
      .from("classrooms")
      .select("id, name_ar, stage_id, stages(name_ar)")
      .order("sort_order")
      .limit(300),
    supabase.from("stages").select("id, name_ar").order("sort_order").limit(50),
    supabase.from("assessment_evidences").select("id", { count: "exact", head: true }),
    supabase.from("classroom_messages").select("id", { count: "exact", head: true }),
  ]);

  return {
    canManage: true,
    classrooms: ((classrooms ?? []) as unknown as {
      id: string;
      name_ar: string;
      stage_id: string | null;
      stages: { name_ar: string } | null;
    }[]).map((c) => ({
      id: c.id,
      nameAr: c.name_ar,
      stageId: c.stage_id,
      stageNameAr: c.stages?.name_ar ?? "—",
    })),
    stages: (stages ?? []).map((s) => ({ id: s.id, nameAr: s.name_ar })),
    evidenceTotal: evidence.count ?? 0,
    chatMessageTotal: messages.count ?? 0,
  };
}

/** How many evidence rows would be removed for the chosen retention window. */
export async function previewEvidenceCleanup(
  supabase: Db,
  userId: string,
  input: { window: RetentionWindow },
): Promise<EvidencePreview> {
  await assertManager(supabase, userId);
  const cutoff = cutoffOf(input.window);

  const { data } = await supabase
    .from("assessment_evidences")
    .select("id, file_path")
    .lt("created_at", cutoff)
    .limit(5000);

  const rows = data ?? [];
  return {
    files: rows.filter((r) => Boolean(r.file_path)).length,
    links: rows.filter((r) => !r.file_path).length,
    cutoff,
  };
}

export async function runEvidenceCleanup(
  supabase: Db,
  userId: string,
  input: { window: RetentionWindow },
): Promise<{ deleted: number; storageRemoved: number }> {
  await assertManager(supabase, userId);
  const cutoff = cutoffOf(input.window);

  const { data, error } = await supabase
    .from("assessment_evidences")
    .select("id, file_path")
    .lt("created_at", cutoff)
    .limit(5000);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (!rows.length) return { deleted: 0, storageRemoved: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths = rows.map((r) => r.file_path).filter((p): p is string => Boolean(p));
  for (let i = 0; i < paths.length; i += 100) {
    await supabaseAdmin.storage.from(ASSESSMENT_BUCKET).remove(paths.slice(i, i + 100));
  }

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error: delError } = await supabaseAdmin
      .from("assessment_evidences")
      .delete()
      .in("id", ids.slice(i, i + 200));
    if (delError) throw new Error(delError.message);
  }

  return { deleted: ids.length, storageRemoved: paths.length };
}

type WipeTarget = { classroomIds: string[]; label: string };

async function chatTarget(
  supabase: Db,
  input: { scope: ChatWipeScope; classroomId?: string | null; stageId?: string | null },
): Promise<WipeTarget> {
  if (input.scope === "classroom") {
    if (!input.classroomId) throw new Error("يرجى اختيار الفصل.");
    const { data } = await supabase
      .from("classrooms")
      .select("id, name_ar")
      .eq("id", input.classroomId)
      .maybeSingle();
    if (!data) throw new Error("الفصل غير موجود.");
    return { classroomIds: [data.id], label: `فصل ${data.name_ar}` };
  }

  if (input.scope === "stage") {
    if (!input.stageId) throw new Error("يرجى اختيار المرحلة.");
    const [{ data: stage }, { data: rooms }] = await Promise.all([
      supabase.from("stages").select("name_ar").eq("id", input.stageId).maybeSingle(),
      supabase.from("classrooms").select("id").eq("stage_id", input.stageId).limit(300),
    ]);
    return {
      classroomIds: (rooms ?? []).map((r) => r.id),
      label: `مرحلة ${stage?.name_ar ?? "—"}`,
    };
  }

  const { data: all } = await supabase.from("classrooms").select("id").limit(500);
  return { classroomIds: (all ?? []).map((r) => r.id), label: "جميع الفصول" };
}

export async function previewChatWipe(
  supabase: Db,
  userId: string,
  input: { scope: ChatWipeScope; classroomId?: string | null; stageId?: string | null },
): Promise<ChatWipePreview> {
  await assertManager(supabase, userId);
  const target = await chatTarget(supabase, input);
  if (!target.classroomIds.length) {
    return { messages: 0, attachments: 0, scopeLabel: target.label };
  }

  const { data } = await supabase
    .from("classroom_messages")
    .select("id, attachments")
    .in("classroom_id", target.classroomIds)
    .limit(10000);

  const rows = data ?? [];
  let attachments = 0;
  for (const row of rows) {
    const list = Array.isArray(row.attachments) ? row.attachments : [];
    attachments += list.length;
  }
  return { messages: rows.length, attachments, scopeLabel: target.label };
}

export async function runChatWipe(
  supabase: Db,
  userId: string,
  input: { scope: ChatWipeScope; classroomId?: string | null; stageId?: string | null },
): Promise<{ messages: number; storageRemoved: number; scopeLabel: string }> {
  await assertManager(supabase, userId);
  const target = await chatTarget(supabase, input);
  if (!target.classroomIds.length) {
    return { messages: 0, storageRemoved: 0, scopeLabel: target.label };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("classroom_messages")
    .select("id, attachments")
    .in("classroom_id", target.classroomIds)
    .limit(10000);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const paths: string[] = [];
  for (const row of rows) {
    const list = Array.isArray(row.attachments) ? row.attachments : [];
    for (const item of list as { path?: string | null }[]) {
      if (item?.path) paths.push(item.path);
    }
  }

  for (let i = 0; i < paths.length; i += 100) {
    await supabaseAdmin.storage.from(CHAT_BUCKET).remove(paths.slice(i, i + 100));
  }

  const ids = rows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error: delError } = await supabaseAdmin
      .from("classroom_messages")
      .delete()
      .in("id", ids.slice(i, i + 200));
    if (delError) throw new Error(delError.message);
  }

  return { messages: ids.length, storageRemoved: paths.length, scopeLabel: target.label };
}
