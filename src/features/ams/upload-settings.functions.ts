import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  exportRegistrationData,
  getUploadSettings,
  purgeRegistrationData,
  registrationDataStats,
  saveUploadSettings,
} from "./upload-settings.server";

export const uploadSettingsGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getUploadSettings(context.supabase));

export const uploadSettingsSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        maxDocumentMb: z.number().min(1).max(50),
        maxReceiptMb: z.number().min(1).max(50),
        compressImages: z.boolean(),
        imageMaxDimension: z.number().int().min(600).max(4000),
        imageQuality: z.number().min(0.4).max(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => saveUploadSettings(context.supabase, context.userId, data));

export const registrationStatsGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => registrationDataStats(context.supabase, context.userId));

export const registrationDataExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => exportRegistrationData(context.supabase, context.userId));

export const registrationDataPurge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(10).max(300), confirm: z.string().min(1).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => purgeRegistrationData(context.supabase, context.userId, data));
