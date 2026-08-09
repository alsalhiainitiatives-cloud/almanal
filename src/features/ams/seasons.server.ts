/**
 * Server-only admission season governance.
 *
 * Every reservation and application belongs to exactly one season, so the
 * academic year is never hardcoded again: it is read from the currently open
 * season (regular or supplementary/إلحاقي).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/features/auth/rbac";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

export type SeasonRow = Database["public"]["Tables"]["admission_seasons"]["Row"];

export type ActiveSeason = {
  id: string;
  academicYear: string;
  nameAr: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  reservationEnabled: boolean;
  closureMessage: string | null;
};

/** Roles allowed to open/close registration seasons. */
const SEASON_ROLES: AppRole[] = ["registration_officer", "principal", "supervisor", "admin"];

async function guardSeasons(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (!roles.some((role) => SEASON_ROLES.includes(role))) {
    throw new Error("ليس لديك صلاحية إدارة مواسم التسجيل.");
  }
  return roles;
}

/** The season currently accepting registrations, or null when the door is shut. */
export async function resolveActiveSeason(supabase: Db): Promise<ActiveSeason | null> {
  const { data } = await supabase.rpc("active_admission_season");
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    id: row.id,
    academicYear: row.academic_year,
    nameAr: row.name_ar,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reservationEnabled: row.reservation_enabled,
    closureMessage: row.closure_message,
  };
}

/** Latest closure message to explain why registration is unavailable. */
export async function seasonClosureMessage(supabase: Db): Promise<string | null> {
  const { data } = await supabase
    .from("admission_seasons")
    .select("closure_message")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.closure_message?.trim() || null;
}

/** Academic year that new records must belong to (open season, else fallback). */
export async function resolveAcademicYear(supabase: Db, fallback: string): Promise<string> {
  const season = await resolveActiveSeason(supabase);
  return season?.academicYear ?? fallback;
}

export async function listSeasons(supabase: Db, userId: string) {
  await guardSeasons(supabase, userId);
  const [seasons, active] = await Promise.all([
    supabase.from("admission_seasons").select("*").order("starts_at", { ascending: false }),
    resolveActiveSeason(supabase),
  ]);
  const rows = seasons.data ?? [];

  const counts = await Promise.all(
    rows.map(async (season) => {
      const [apps, reservations] = await Promise.all([
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("academic_year", season.academic_year),
        supabase
          .from("seat_reservations")
          .select("id", { count: "exact", head: true })
          .eq("academic_year", season.academic_year),
      ]);
      return { id: season.id, applications: apps.count ?? 0, reservations: reservations.count ?? 0 };
    }),
  );

  return {
    seasons: rows.map((season) => ({
      ...season,
      stats: counts.find((c) => c.id === season.id) ?? { applications: 0, reservations: 0 },
      effectiveOpen: active?.id === season.id,
    })),
    activeSeasonId: active?.id ?? null,
  };
}

export type SeasonSaveInput = {
  id?: string | null;
  academic_year: string;
  name_ar: string;
  kind: "regular" | "supplementary";
  starts_at: string;
  ends_at: string;
  reservation_enabled: boolean;
  closure_message?: string | null;
  notes?: string | null;
  status?: "draft" | "open" | "closed";
};

export async function saveSeason(supabase: Db, userId: string, input: SeasonSaveInput) {
  await guardSeasons(supabase, userId);
  if (new Date(input.ends_at).getTime() <= new Date(input.starts_at).getTime()) {
    throw new Error("تاريخ نهاية التسجيل يجب أن يكون بعد تاريخ البداية.");
  }

  const payload = {
    academic_year: input.academic_year.trim(),
    name_ar: input.name_ar.trim(),
    kind: input.kind,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    reservation_enabled: input.reservation_enabled,
    closure_message: input.closure_message?.trim() || null,
    notes: input.notes?.trim() || null,
    ...(input.status ? { status: input.status } : {}),
  };

  if (input.id) {
    const { error } = await supabase.from("admission_seasons").update(payload).eq("id", input.id);
    if (error) throw new Error(seasonError(error.message));
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("admission_seasons")
    .insert({ ...payload, created_by: userId })
    .select("id")
    .single();
  if (error || !data) throw new Error(seasonError(error?.message ?? ""));
  return { id: data.id };
}

function seasonError(message: string) {
  if (message.includes("admission_seasons_year_kind_key")) {
    return "يوجد موسم بنفس العام الدراسي والنوع — عدّل الموسم القائم بدلاً من إنشاء موسم مكرر.";
  }
  return "تعذّر حفظ موسم التسجيل، حاول مرة أخرى.";
}

export async function setSeasonStatus(
  supabase: Db,
  userId: string,
  input: { id: string; status: "draft" | "open" | "closed" },
) {
  await guardSeasons(supabase, userId);
  const { error } = await supabase
    .from("admission_seasons")
    .update({ status: input.status })
    .eq("id", input.id);
  if (error) throw new Error("تعذّر تحديث حالة الموسم.");
  return { ok: true as const };
}

export async function deleteSeason(supabase: Db, userId: string, id: string) {
  await guardSeasons(supabase, userId);
  const { data: season } = await supabase
    .from("admission_seasons")
    .select("academic_year")
    .eq("id", id)
    .maybeSingle();
  if (season) {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("academic_year", season.academic_year);
    if ((count ?? 0) > 0) {
      return { ok: false as const, reason: "لا يمكن حذف موسم يحتوي على طلبات — أغلقه بدلاً من الحذف." };
    }
  }
  const { error } = await supabase.from("admission_seasons").delete().eq("id", id);
  if (error) return { ok: false as const, reason: "تعذّر حذف الموسم." };
  return { ok: true as const };
}