/**
 * Client-side registration-form configuration.
 *
 * Steps / fields / document types are stored in the database so staff can
 * customise the wizard. Any change is pushed to open wizards through
 * Supabase realtime, so parents always fill the latest version.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Baby,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Sparkles,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export type FormStepRow = {
  id: string;
  key: string;
  name_ar: string;
  short_ar: string;
  description_ar: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
};

export type FormFieldRow = {
  id: string;
  step_id: string;
  key: string;
  label_ar: string;
  help_ar: string | null;
  placeholder_ar: string | null;
  field_type: string;
  options: { value: string; label: string }[];
  is_required: boolean;
  is_visible: boolean;
  is_system: boolean;
  applies_to: string;
  sort_order: number;
};

export const STEP_ICONS: Record<string, LucideIcon> = {
  UserRound,
  Baby,
  HeartHandshake,
  Sparkles,
  FileText,
  ClipboardCheck,
  Wallet,
};

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "نص قصير",
  textarea: "نص طويل",
  number: "رقم",
  date: "تاريخ",
  select: "قائمة اختيار",
  multiselect: "اختيار متعدد",
  checkbox: "مربع تأكيد",
  phone: "رقم جوال",
  email: "بريد إلكتروني",
};

/** Numeric wizard ids kept stable for the built-in steps. */
export const BUILTIN_STEP_IDS: Record<string, number> = {
  parent: 3,
  children: 4,
  qurra: 5,
  services: 6,
  documents: 7,
  review: 8,
  financial: 9,
};

export function stepIcon(name: string | null | undefined): LucideIcon {
  return STEP_ICONS[name ?? ""] ?? Sparkles;
}

async function fetchPublicFormConfig() {
  const [steps, fields] = await Promise.all([
    supabase.from("form_steps").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("form_fields").select("*").eq("is_visible", true).order("sort_order"),
  ]);
  return {
    steps: (steps.data ?? []) as unknown as FormStepRow[],
    fields: (fields.data ?? []) as unknown as FormFieldRow[],
  };
}

/**
 * Live registration-form configuration. Subscribes to realtime changes so an
 * admin edit reaches open wizards immediately.
 */
export function useFormConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admissions", "form-config"],
    queryFn: fetchPublicFormConfig,
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`form-config-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "form_steps" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admissions", "form-config"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "form_fields" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admissions", "form-config"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "document_types" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admissions", "catalog"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export type CustomValues = Record<string, Record<string, unknown>>;

/** Validates the custom (admin-defined) fields of one step. */
export function validateCustomFields(
  fields: FormFieldRow[],
  values: Record<string, unknown> | undefined,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.is_required || !field.is_visible) continue;
    const value = values?.[field.key];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      value === false ||
      (Array.isArray(value) && value.length === 0);
    if (empty) errors[field.key] = `${field.label_ar} مطلوب`;
  }
  return errors;
}