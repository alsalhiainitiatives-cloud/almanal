import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  deleteDocumentType,
  deleteField,
  deleteStep,
  getFormConfig,
  reorderFields,
  reorderSteps,
  saveDocumentType,
  saveField,
  saveStep,
  setStepActive,
  toggleField,
} from "./form-config.server";

const uuid = z.string().uuid();

export const formConfigGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getFormConfig(context.supabase, context.userId));

export const formStepSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        key: z.string().trim().max(50).default(""),
        name_ar: z.string().trim().min(2).max(80),
        short_ar: z.string().trim().min(2).max(30),
        description_ar: z.string().trim().max(400).nullish(),
        icon: z.string().trim().max(40).nullish(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveStep(context.supabase, context.userId, data));

export const formStepDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteStep(context.supabase, context.userId, data.id));

export const formStepToggle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid, active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) =>
    setStepActive(context.supabase, context.userId, data.id, data.active),
  );

export const formStepsReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ids: z.array(uuid).max(40) }).parse(data))
  .handler(async ({ data, context }) => reorderSteps(context.supabase, context.userId, data.ids));

export const formFieldSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        step_id: uuid,
        key: z.string().trim().max(50).default(""),
        label_ar: z.string().trim().min(2).max(120),
        help_ar: z.string().trim().max(300).nullish(),
        placeholder_ar: z.string().trim().max(120).nullish(),
        field_type: z.enum([
          "text",
          "textarea",
          "number",
          "date",
          "select",
          "multiselect",
          "checkbox",
          "phone",
          "email",
        ]),
        options: z
          .array(z.object({ value: z.string().trim().max(80), label: z.string().trim().max(120) }))
          .max(30)
          .optional(),
        is_required: z.boolean().optional(),
        is_visible: z.boolean().optional(),
        applies_to: z.enum(["application", "child"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveField(context.supabase, context.userId, data));

export const formFieldDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteField(context.supabase, context.userId, data.id));

export const formFieldToggle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: uuid, is_required: z.boolean().optional(), is_visible: z.boolean().optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    toggleField(context.supabase, context.userId, data.id, {
      is_required: data.is_required,
      is_visible: data.is_visible,
    }),
  );

export const formFieldsReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ids: z.array(uuid).max(80) }).parse(data))
  .handler(async ({ data, context }) => reorderFields(context.supabase, context.userId, data.ids));

export const formDocTypeSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: uuid.nullish(),
        slug: z.string().trim().max(60).default(""),
        name_ar: z.string().trim().min(2).max(120),
        description_ar: z.string().trim().max(400).nullish(),
        scope: z.enum(["parent", "child"]),
        applies_to_nationality: z.enum(["all", "saudi", "non_saudi"]).optional(),
        is_required: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveDocumentType(context.supabase, context.userId, data));

export const formDocTypeDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: uuid }).parse(data))
  .handler(async ({ data, context }) => deleteDocumentType(context.supabase, context.userId, data.id));