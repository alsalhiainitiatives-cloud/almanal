/**
 * Server-only issuer for the unified academic number `MN-{stage}-{YY}-{NNN}`.
 *
 * The same number is used as the application number, tracking number and the
 * student's academic number — the platform issues exactly one identifier.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { academicNumberPrefix, stageCode } from "./academic-number";

type Db = SupabaseClient<Database>;

export async function issueAcademicNumber(
  supabase: Db,
  applicationId: string,
  academicYear: string,
): Promise<string> {
  const { data: child } = await supabase
    .from("application_children")
    .select("stage_id")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: app } = await supabase
    .from("applications")
    .select("stage_id")
    .eq("id", applicationId)
    .maybeSingle();

  const stageId = child?.stage_id ?? app?.stage_id ?? null;
  let code = 1;
  if (stageId) {
    const { data: stage } = await supabase
      .from("stages")
      .select("slug, sort_order")
      .eq("id", stageId)
      .maybeSingle();
    code = stageCode(stage?.slug, stage?.sort_order);
  }

  const prefix = academicNumberPrefix(academicYear, code);
  const { data, error } = await supabase.rpc("next_academic_number", { _prefix: prefix });
  if (error || !data) throw new Error("تعذّر إصدار الرقم الأكاديمي للطالب.");
  return data as string;
}
