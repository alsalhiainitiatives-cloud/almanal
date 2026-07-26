/** Server-only catalog reads (public data, publishable key, RLS as anon). */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
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
}

export async function fetchStages() {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("stages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error("تعذّر تحميل المراحل التعليمية.");
  return data ?? [];
}

export async function fetchStageBundle(slug: string) {
  const supabase = publicClient();
  const { data: stage } = await supabase
    .from("stages")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!stage) return null;

  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("*")
    .eq("stage_id", stage.id)
    .eq("is_active", true)
    .order("sort_order");

  return { stage, classrooms: classrooms ?? [] };
}

export async function fetchCatalog() {
  const supabase = publicClient();
  const [stages, classrooms, services, documentTypes] = await Promise.all([
    supabase.from("stages").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("classrooms").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("document_types").select("*").eq("is_active", true).order("sort_order"),
  ]);
  return {
    stages: stages.data ?? [],
    classrooms: classrooms.data ?? [],
    services: services.data ?? [],
    documentTypes: documentTypes.data ?? [],
  };
}