/**
 * Server-only service for the registration form builder
 * (steps, fields and document types).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

export type StepInput = {
  id?: string | null;
  key: string;
  name_ar: string;
  short_ar: string;
  description_ar?: string | null;
  icon?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
};

export type FieldInput = {
  id?: string | null;
  step_id: string;
  key: string;
  label_ar: string;
  help_ar?: string | null;
  placeholder_ar?: string | null;
  field_type: string;
  options?: { value: string; label: string }[];
  is_required?: boolean;
  is_visible?: boolean;
  applies_to?: string;
  sort_order?: number | null;
};

export type DocTypeInput = {
  id?: string | null;
  slug: string;
  name_ar: string;
  description_ar?: string | null;
  scope: string;
  applies_to_nationality?: string;
  is_required?: boolean;
  is_active?: boolean;
  sort_order?: number | null;
};

async function guardAdmin(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!roles.includes("admin") && !roles.includes("supervisor")) {
    throw new Error("هذا القسم متاح لمدير النظام والمشرف فقط.");
  }
  return roles;
}

export async function getFormConfig(supabase: Db, userId: string) {
  // Reading the form configuration must stay open to every signed-in user:
  // the public admission wizard renders from this exact config.
  const [steps, fields, docs] = await Promise.all([
    supabase.from("form_steps").select("*").order("sort_order"),
    supabase.from("form_fields").select("*").order("sort_order"),
    supabase.from("document_types").select("*").order("sort_order"),
  ]);
  if (steps.error) throw new Error("تعذّر تحميل خطوات النموذج.");
  return {
    steps: steps.data ?? [],
    fields: fields.data ?? [],
    documentTypes: docs.data ?? [],
  };
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || `f_${Date.now().toString(36)}`
  );
}

export async function saveStep(supabase: Db, userId: string, input: StepInput) {
  await guardAdmin(supabase, userId);
  const payload = {
    name_ar: input.name_ar.trim(),
    short_ar: input.short_ar.trim(),
    description_ar: input.description_ar?.trim() || null,
    icon: input.icon?.trim() || "Sparkles",
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from("form_steps").update(payload).eq("id", input.id);
    if (error) throw new Error("تعذّر حفظ المرحلة.");
    return { id: input.id };
  }

  const { data: last } = await supabase
    .from("form_steps")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("form_steps")
    .insert({
      ...payload,
      key: slugify(input.key || input.short_ar),
      sort_order: (last?.sort_order ?? 0) + 1,
      is_system: false,
    })
    .select("id")
    .single();
  if (error) throw new Error("تعذّر إنشاء المرحلة، تأكد من عدم تكرار المعرّف.");
  return { id: data.id };
}

export async function deleteStep(supabase: Db, userId: string, id: string) {
  await guardAdmin(supabase, userId);
  const { data: step } = await supabase.from("form_steps").select("is_system").eq("id", id).maybeSingle();
  if (!step) throw new Error("المرحلة غير موجودة.");
  if (step.is_system) throw new Error("لا يمكن حذف مرحلة نظامية، يمكنك تعطيلها بدلًا من ذلك.");
  const { error } = await supabase.from("form_steps").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف المرحلة.");
  return { ok: true };
}

export async function setStepActive(supabase: Db, userId: string, id: string, active: boolean) {
  await guardAdmin(supabase, userId);
  const { error } = await supabase.from("form_steps").update({ is_active: active }).eq("id", id);
  if (error) throw new Error("تعذّر تحديث حالة المرحلة.");
  return { ok: true };
}

export async function reorderSteps(supabase: Db, userId: string, ids: string[]) {
  await guardAdmin(supabase, userId);
  await Promise.all(
    ids.map((id, index) => supabase.from("form_steps").update({ sort_order: index + 1 }).eq("id", id)),
  );
  return { ok: true };
}

export async function saveField(supabase: Db, userId: string, input: FieldInput) {
  await guardAdmin(supabase, userId);
  const payload = {
    step_id: input.step_id,
    label_ar: input.label_ar.trim(),
    help_ar: input.help_ar?.trim() || null,
    placeholder_ar: input.placeholder_ar?.trim() || null,
    field_type: input.field_type,
    options: (input.options ?? []).filter((o) => o.value.trim()) as never,
    is_required: input.is_required ?? false,
    is_visible: input.is_visible ?? true,
    applies_to: input.applies_to ?? "application",
  };

  if (input.id) {
    const { error } = await supabase.from("form_fields").update(payload).eq("id", input.id);
    if (error) throw new Error("تعذّر حفظ الحقل.");
    return { id: input.id };
  }

  const { data: last } = await supabase
    .from("form_fields")
    .select("sort_order")
    .eq("step_id", input.step_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("form_fields")
    .insert({
      ...payload,
      key: slugify(input.key || input.label_ar),
      sort_order: (last?.sort_order ?? 0) + 1,
      is_system: false,
    })
    .select("id")
    .single();
  if (error) throw new Error("تعذّر إنشاء الحقل، تأكد من عدم تكرار المعرّف داخل نفس المرحلة.");
  return { id: data.id };
}

export async function deleteField(supabase: Db, userId: string, id: string) {
  await guardAdmin(supabase, userId);
  const { data: field } = await supabase.from("form_fields").select("is_system").eq("id", id).maybeSingle();
  if (!field) throw new Error("الحقل غير موجود.");
  if (field.is_system) throw new Error("الحقول النظامية لا يمكن حذفها، يمكنك إخفاؤها فقط.");
  const { error } = await supabase.from("form_fields").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف الحقل.");
  return { ok: true };
}

export async function toggleField(
  supabase: Db,
  userId: string,
  id: string,
  patch: { is_required?: boolean; is_visible?: boolean },
) {
  await guardAdmin(supabase, userId);
  const { error } = await supabase.from("form_fields").update(patch).eq("id", id);
  if (error) throw new Error("تعذّر تحديث الحقل.");
  return { ok: true };
}

export async function reorderFields(supabase: Db, userId: string, ids: string[]) {
  await guardAdmin(supabase, userId);
  await Promise.all(
    ids.map((id, index) => supabase.from("form_fields").update({ sort_order: index + 1 }).eq("id", id)),
  );
  return { ok: true };
}

export async function saveDocumentType(supabase: Db, userId: string, input: DocTypeInput) {
  await guardAdmin(supabase, userId);
  const payload = {
    name_ar: input.name_ar.trim(),
    description_ar: input.description_ar?.trim() || null,
    scope: input.scope,
    applies_to_nationality: input.applies_to_nationality ?? "all",
    is_required: input.is_required ?? false,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from("document_types").update(payload).eq("id", input.id);
    if (error) throw new Error("تعذّر حفظ نوع المستند.");
    return { id: input.id };
  }

  const { data: last } = await supabase
    .from("document_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("document_types")
    .insert({
      ...payload,
      slug: slugify(input.slug || input.name_ar),
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) throw new Error("تعذّر إنشاء نوع المستند، تأكد من عدم تكرار المعرّف.");
  return { id: data.id };
}

export async function deleteDocumentType(supabase: Db, userId: string, id: string) {
  await guardAdmin(supabase, userId);
  const { data: doc } = await supabase.from("document_types").select("slug").eq("id", id).maybeSingle();
  if (!doc) throw new Error("نوع المستند غير موجود.");

  const { count } = await supabase
    .from("application_documents")
    .select("id", { count: "exact", head: true })
    .eq("document_type_slug", doc.slug);
  if ((count ?? 0) > 0) {
    throw new Error("لا يمكن حذف نوع مستند مستخدم في طلبات قائمة، يمكنك تعطيله بدلًا من ذلك.");
  }

  const { error } = await supabase.from("document_types").delete().eq("id", id);
  if (error) throw new Error("تعذّر حذف نوع المستند.");
  return { ok: true };
}