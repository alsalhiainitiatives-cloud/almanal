import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const numberSchema = z
  .string()
  .trim()
  .min(4, "رقم الطلب غير صحيح")
  .max(40, "رقم الطلب غير صحيح");

export const publicTrackApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => numberSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const [summary, events] = await Promise.all([
      supabase.rpc("track_application_public", { _application_number: data }),
      supabase.rpc("track_application_events_public", { _application_number: data }),
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
    };
  });