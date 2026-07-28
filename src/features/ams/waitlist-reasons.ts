/**
 * Waiting-list reason codes.
 *
 * Every preference the parent picked is evaluated against the child's age and
 * the live capacity of the classroom, and resolves to exactly one code. The
 * same codes are shown to staff (workspace + waiting-list tab) and copied into
 * the parent-facing explanation, so both sides read the identical reason.
 */
export type WaitlistCode =
  | "WL-00"
  | "WL-01"
  | "WL-02"
  | "WL-03"
  | "WL-04"
  | "WL-05";

export const WAITLIST_REASONS: Record<
  WaitlistCode,
  { label: string; detail: string; tone: "ok" | "warn" | "muted" }
> = {
  "WL-00": {
    label: "رغبة غير محددة",
    detail: "لم يختر ولي الأمر فصلًا لهذه الرغبة في نموذج التسجيل.",
    tone: "muted",
  },
  "WL-01": {
    label: "قبول فوري متاح",
    detail: "الفصل مطابق لعمر الطفل وبه مقاعد شاغرة — يمكن حجز المقعد مباشرة.",
    tone: "ok",
  },
  "WL-02": {
    label: "الفصل مكتمل العدد",
    detail: "لا توجد مقاعد شاغرة حاليًا؛ يُدرج الطفل على قائمة الانتظار حسب ترتيب التقديم.",
    tone: "warn",
  },
  "WL-03": {
    label: "خارج النطاق العمري",
    detail: "عمر الطفل لا يقع ضمن النطاق العمري المعتمد للفصل، ولا يمكن قبوله فيه.",
    tone: "warn",
  },
  "WL-04": {
    label: "الفصل غير مفعّل",
    detail: "الفصل موقوف حاليًا ولا يستقبل تسجيلات لهذا العام الدراسي.",
    tone: "muted",
  },
  "WL-05": {
    label: "قائمة الانتظار ممتلئة",
    detail: "بلغت قائمة انتظار الفصل الحد الأقصى المسموح به.",
    tone: "warn",
  },
};

type ClassroomLike = {
  id: string;
  name_ar: string;
  capacity: number;
  taken_seats: number;
  min_age_months: number;
  max_age_months: number;
  max_waiting?: number | null;
  is_active?: boolean | null;
};

export type PreferenceVerdict = {
  index: number;
  classroom: ClassroomLike | null;
  code: WaitlistCode;
  free: number;
  admissible: boolean;
};

export function evaluatePreference(
  index: number,
  classroom: ClassroomLike | null | undefined,
  childMonths: number | null,
  waitingCount = 0,
): PreferenceVerdict {
  if (!classroom) return { index, classroom: null, code: "WL-00", free: 0, admissible: false };

  const free = Math.max(0, classroom.capacity - classroom.taken_seats);
  const ageOk =
    childMonths === null ||
    (childMonths >= classroom.min_age_months && childMonths <= classroom.max_age_months);

  let code: WaitlistCode = "WL-01";
  if (classroom.is_active === false) code = "WL-04";
  else if (!ageOk) code = "WL-03";
  else if (free <= 0) code = (classroom.max_waiting ?? 0) > 0 && waitingCount >= (classroom.max_waiting ?? 0) ? "WL-05" : "WL-02";

  return { index, classroom, code, free, admissible: code === "WL-01" };
}

export function evaluatePreferences(
  preferenceIds: (string | null | undefined)[],
  classrooms: ClassroomLike[],
  childMonths: number | null,
): PreferenceVerdict[] {
  return preferenceIds.map((id, index) =>
    evaluatePreference(index, id ? classrooms.find((c) => c.id === id) : null, childMonths),
  );
}

/** Parent-facing sentence summarising the whole set of preferences. */
export function waitlistSummary(verdicts: PreferenceVerdict[], childName: string) {
  const accepted = verdicts.find((v) => v.admissible);
  const blocked = verdicts.filter((v) => v.classroom && !v.admissible);
  const blockedText = blocked
    .map((v) => `الرغبة ${v.index + 1} (${v.classroom?.name_ar}): ${WAITLIST_REASONS[v.code].label} [${v.code}]`)
    .join(" · ");

  if (accepted) {
    return `${blockedText ? `${blockedText}. ` : ""}يمكن قبول ${childName} مباشرة في الرغبة ${accepted.index + 1} (${accepted.classroom?.name_ar}) لتوفّر ${accepted.free} مقعدًا مطابقًا للعمر.`;
  }
  return `${blockedText || "لا توجد رغبات محددة"}. لا يتوفّر حاليًا فصل مطابق ضمن رغبات ولي الأمر، ويوضع ${childName} على قائمة الانتظار مع إشعاره فور توفّر مقعد.`;
}