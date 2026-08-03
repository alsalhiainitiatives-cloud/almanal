import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadSettingsGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUploadSettings } = await import("./upload-settings.server");
    return getUploadSettings(context.supabase);
  });

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
  .handler(async ({ data, context }) => {
    const { saveUploadSettings } = await import("./upload-settings.server");
    return saveUploadSettings(context.supabase, context.userId, data);
  });

export const registrationStatsGet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { registrationDataStats } = await import("./upload-settings.server");
    return registrationDataStats(context.supabase, context.userId);
  });

export const registrationDataExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { exportRegistrationData } = await import("./upload-settings.server");
    return exportRegistrationData(context.supabase, context.userId);
  });

export const registrationDataPurge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ token: z.string().min(10).max(300), confirm: z.string().min(1).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { purgeRegistrationData } = await import("./upload-settings.server");
    return purgeRegistrationData(context.supabase, context.userId, data);
  });
