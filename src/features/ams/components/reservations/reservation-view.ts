/** Shared client-side view model for the Step 0 (الحجز المبدئي) staff board. */
export type ReservationChildRow = {
  id: string;
  name_ar: string;
  national_id: string | null;
  gender: string | null;
  birth_date: string | null;
  stage_id: string | null;
  preference_1_classroom_id: string | null;
  preference_2_classroom_id: string | null;
  preference_3_classroom_id: string | null;
  assigned_classroom_id: string | null;
  waitlisted: boolean | null;
  sort_order: number;
};

export type ReservationRow = {
  id: string;
  parent_id: string;
  parent_name: string;
  parent_national_id: string;
  status: string;
  created_at: string;
  decided_at?: string | null;
  decision_note?: string | null;
  application_id: string | null;
  season_id: string | null;
  academic_year: string;
  children?: ReservationChildRow[] | null;
};

export type ClassroomRow = {
  id: string;
  name_ar: string;
  capacity: number;
  taken_seats: number;
  min_age_months: number;
  max_age_months: number;
  is_active?: boolean | null;
};

export type ApplicationLite = { id: string; status: string; application_number: string | null };

export type ReservationSort = "recent" | "oldest" | "name" | "children";

export const RESERVATION_SORT_LABELS: Record<ReservationSort, string> = {
  recent: "الأحدث أولاً",
  oldest: "الأقدم أولاً (الأولوية)",
  name: "اسم ولي الأمر",
  children: "عدد الأطفال",
};

export function waitingDays(row: ReservationRow) {
  return Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000));
}

export function progressOf(row: ReservationRow, applications: ApplicationLite[]) {
  const app = row.application_id ? applications.find((a) => a.id === row.application_id) : null;
  const done = Boolean(app && app.status !== "draft");
  return {
    started: Boolean(app),
    done,
    label: done
      ? "تم استكمال البيانات"
      : app
        ? "مسودة قيد الاستكمال"
        : "لم يبدأ التسجيل النهائي",
    number: app?.application_number ?? null,
  };
}

export function matchesReservation(
  row: ReservationRow,
  needle: string,
  applications: ApplicationLite[],
) {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  const app = progressOf(row, applications);
  return [
    row.parent_name,
    row.parent_national_id,
    app.number ?? "",
    ...(row.children ?? []).flatMap((c) => [c.name_ar, c.national_id ?? ""]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function sortReservations(rows: ReservationRow[], sort: ReservationSort) {
  const out = [...rows];
  out.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.created_at.localeCompare(b.created_at);
      case "name":
        return a.parent_name.localeCompare(b.parent_name, "ar");
      case "children":
        return (b.children?.length ?? 0) - (a.children?.length ?? 0);
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return out;
}

/** Preference 1 → 2 → 3; mirrors the server-side placement rule. */
export function placementHint(
  child: ReservationChildRow,
  months: number | null,
  classrooms: ClassroomRow[],
) {
  const prefs = [
    child.preference_1_classroom_id,
    child.preference_2_classroom_id,
    child.preference_3_classroom_id,
  ];
  for (let i = 0; i < prefs.length; i++) {
    const room = classrooms.find((c) => c.id === prefs[i]);
    if (!room || room.is_active === false) continue;
    const free = Math.max(0, room.capacity - room.taken_seats);
    const ageOk = months === null || (months >= room.min_age_months && months <= room.max_age_months);
    if (ageOk && free > 0) {
      return {
        ok: true,
        room,
        text: `تسكين مباشر في «${room.name_ar}» (الرغبة ${i + 1}) — ${free} مقعد متاح`,
      };
    }
  }
  const first = classrooms.find((c) => c.id === prefs.find(Boolean));
  return {
    ok: false,
    room: first ?? null,
    text: first
      ? `لا يوجد مقعد مطابق — الاقتراح: قائمة انتظار «${first.name_ar}»`
      : "لم يتم اختيار فصول",
  };
}

export function reservationsToCsv(rows: ReservationRow[], classrooms: ClassroomRow[], applications: ApplicationLite[]) {
  const head = [
    "ولي الأمر",
    "هوية ولي الأمر",
    "الطفل",
    "هوية الطفل",
    "الفصل / الرغبة الأولى",
    "الحالة",
    "استكمال التسجيل",
    "الرقم الأكاديمي",
    "تاريخ الطلب",
  ];
  const lines = rows.flatMap((row) => {
    const app = progressOf(row, applications);
    return (row.children ?? []).map((child) => {
      const room = classrooms.find(
        (c) => c.id === (child.assigned_classroom_id ?? child.preference_1_classroom_id),
      );
      return [
        row.parent_name,
        row.parent_national_id,
        child.name_ar,
        child.national_id ?? "",
        room?.name_ar ?? "",
        row.status,
        app.label,
        app.number ?? "",
        new Date(row.created_at).toLocaleDateString("ar-SA"),
      ];
    });
  });
  return [head, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}