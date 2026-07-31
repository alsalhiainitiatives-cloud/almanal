import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { mergeSiteContent, type SiteContent } from "./defaults";

const CONTENT_KEY = "site";

/** Public read of the editable website content (anon-safe). */
export const siteContentGet = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteContent> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return mergeSiteContent({});

    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data } = await client
      .from("site_content")
      .select("data")
      .eq("key", CONTENT_KEY)
      .maybeSingle();

    return mergeSiteContent(data?.data ?? {});
  },
);

/** Saves the full content document. Admins and the principal only. */
export const siteContentSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { content: SiteContent }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isPrincipal } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "principal",
    });
    if (!isAdmin && !isPrincipal) throw new Error("غير مصرح بتعديل محتوى الموقع.");

    const { error } = await context.supabase.from("site_content").upsert(
      {
        key: CONTENT_KEY,
        data: data.content as never,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });