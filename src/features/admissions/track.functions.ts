import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { normalizeApplicationCode } from "./application-code";

const inputSchema = z.object({
  number: z
    .string()
    .trim()
    .min(4, "رقم الطلب غير صحيح")
    .max(40, "رقم الطلب غير صحيح")
    .transform((value) => normalizeApplicationCode(value) || value),
  token: z
    .string()
    .trim()
    .min(16, "رمز التحقق غير صحيح")
    .max(120, "رمز التحقق غير صحيح"),
});

export const publicTrackApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const args = { _application_number: data.number, _token: data.token };
    const [summary, events, documents] = await Promise.all([
      supabase.rpc("track_application_public", args),
      supabase.rpc("track_application_events_public", args),
      supabase.rpc("track_application_documents_public", args),
    ]);

    if (summary.error) {
      console.error("public track failed", summary.error);
      throw new Error("تعذّر البحث عن الطلب حاليًا، يرجى المحاولة لاحقًا.");
    }

    const row = summary.data?.[0] ?? null;
    if (!row) return { found: false as const };

    return {
      found: true as const,
      application: row,
      events: events.data ?? [],
      documentRequests: documents.data ?? [],
    };
  });