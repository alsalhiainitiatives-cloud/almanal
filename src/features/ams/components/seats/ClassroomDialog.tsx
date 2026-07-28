import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

export type ClassroomDraft = {
  id?: string | null;
  stage_id: string;
  name_ar: string;
  color_hex: string;
  color_label: string;
  teacher_name: string;
  teacher_title: string;
  teacher_qualification: string;
  teacher_experience: string;
  teachers: { name: string; title?: string; qualification?: string; experience?: string }[];
  capacity: number;
  max_waiting: number;
  min_age_months: number;
  max_age_months: number;
  description_ar: string;
  learning_style_ar: string;
  schedule_ar: string;
  daily_schedule: { time: string; activity: string }[];
  sort_order: number;
  is_active: boolean;
};

export function emptyClassroom(stageId: string): ClassroomDraft {
  return {
    stage_id: stageId,
    name_ar: "",
    color_hex: "#7A1F3D",
    color_label: "",
    teacher_name: "",
    teacher_title: "معلمة الفصل",
    teacher_qualification: "",
    teacher_experience: "",
    teachers: [],
    capacity: 20,
    max_waiting: 10,
    min_age_months: 36,
    max_age_months: 48,
    description_ar: "",
    learning_style_ar: "",
    schedule_ar: "",
    daily_schedule: [],
    sort_order: 0,
    is_active: true,
  };
}

export function toDraft(c: Record<string, unknown>): ClassroomDraft {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id: c.id as string,
    stage_id: c.stage_id as string,
    name_ar: s(c.name_ar),
    color_hex: s(c.color_hex) || "#7A1F3D",
    color_label: s(c.color_label),
    teacher_name: s(c.teacher_name),
    teacher_title: s(c.teacher_title),
    teacher_qualification: s(c.teacher_qualification),
    teacher_experience: s(c.teacher_experience),
    teachers: Array.isArray(c.teachers) ? (c.teachers as ClassroomDraft["teachers"]) : [],
    capacity: Number(c.capacity ?? 20),
    max_waiting: Number(c.max_waiting ?? 10),
    min_age_months: Number(c.min_age_months ?? 36),
    max_age_months: Number(c.max_age_months ?? 48),
    description_ar: s(c.description_ar),
    learning_style_ar: s(c.learning_style_ar),
    schedule_ar: s(c.schedule_ar),
    daily_schedule: Array.isArray(c.daily_schedule) ? (c.daily_schedule as ClassroomDraft["daily_schedule"]) : [],
    sort_order: Number(c.sort_order ?? 0),
    is_active: c.is_active !== false,
  };
}

const field = "w-full rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-primary";
const label = "text-[11px] font-extrabold text-muted-foreground";

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className={label}>{title}</span>
      {children}
    </label>
  );
}

export function ClassroomDialog({
  initial,
  stages,
  busy,
  onClose,
  onSubmit,
}: {
  initial: ClassroomDraft;
  stages: { id: string; name_ar: string }[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (draft: ClassroomDraft) => void;
}) {
  const [draft, setDraft] = useState<ClassroomDraft>(initial);
  const set = <K extends keyof ClassroomDraft>(key: K, value: ClassroomDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const invalid =
    draft.name_ar.trim().length < 2 || draft.min_age_months >= draft.max_age_months || draft.capacity < 1;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              {draft.id ? "تعديل إعدادات الفصل" : "إضافة فصل جديد"}
            </h3>
            <p className="mt-1 text-[11px] font-bold text-muted-foreground">
              تنعكس هذه التفاصيل مباشرة على صفحات المراحل والفصول في الموقع العام.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Row title="المرحلة العمرية">
            <select value={draft.stage_id} onChange={(e) => set("stage_id", e.target.value)} className={field}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
          </Row>
          <Row title="اسم الفصل">
            <input value={draft.name_ar} onChange={(e) => set("name_ar", e.target.value)} className={field} placeholder="الفصل الأصفر" />
          </Row>
          <Row title="لون الفصل">
            <div className="flex items-center gap-2">
              <input type="color" value={draft.color_hex} onChange={(e) => set("color_hex", e.target.value)} className="size-10 rounded-xl border border-border/60" />
              <input value={draft.color_hex} onChange={(e) => set("color_hex", e.target.value)} className={field} />
            </div>
          </Row>
          <Row title="اسم اللون (اختياري)">
            <input value={draft.color_label} onChange={(e) => set("color_label", e.target.value)} className={field} placeholder="أصفر" />
          </Row>
          <Row title="الحد الأقصى للمقاعد">
            <input type="number" min={1} value={draft.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={field} />
          </Row>
          <Row title="الحد الأقصى لقائمة الانتظار">
            <input type="number" min={0} value={draft.max_waiting} onChange={(e) => set("max_waiting", Number(e.target.value))} className={field} />
          </Row>
          <Row title="أقل عمر (بالأشهر)">
            <input type="number" min={0} value={draft.min_age_months} onChange={(e) => set("min_age_months", Number(e.target.value))} className={field} />
          </Row>
          <Row title="أعلى عمر (بالأشهر)">
            <input type="number" min={1} value={draft.max_age_months} onChange={(e) => set("max_age_months", Number(e.target.value))} className={field} />
          </Row>
          <Row title="جدول الفصل (ملخص)">
            <input value={draft.schedule_ar} onChange={(e) => set("schedule_ar", e.target.value)} className={field} placeholder="7:00 ص - 12:30 م" />
          </Row>
          <Row title="أسلوب التعلم">
            <input value={draft.learning_style_ar} onChange={(e) => set("learning_style_ar", e.target.value)} className={field} placeholder="مونتيسوري" />
          </Row>
          <Row title="ترتيب العرض">
            <input type="number" min={0} value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={field} />
          </Row>
          <Row title="حالة الفصل">
            <select value={draft.is_active ? "1" : "0"} onChange={(e) => set("is_active", e.target.value === "1")} className={field}>
              <option value="1">مفعّل ويظهر في الموقع</option>
              <option value="0">معطّل ومخفي</option>
            </select>
          </Row>
        </div>

        <div className="mt-4">
          <Row title="وصف الفصل">
            <textarea rows={3} value={draft.description_ar} onChange={(e) => set("description_ar", e.target.value)} className={field} />
          </Row>
        </div>

        <div className="mt-5 rounded-3xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-foreground">المعلمة الأساسية</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Row title="اسم المعلمة">
              <input value={draft.teacher_name} onChange={(e) => set("teacher_name", e.target.value)} className={field} />
            </Row>
            <Row title="الصفة">
              <input value={draft.teacher_title} onChange={(e) => set("teacher_title", e.target.value)} className={field} />
            </Row>
            <Row title="المؤهل العلمي">
              <input value={draft.teacher_qualification} onChange={(e) => set("teacher_qualification", e.target.value)} className={field} placeholder="بكالوريوس رياض أطفال" />
            </Row>
            <Row title="الخبرة التعليمية">
              <input value={draft.teacher_experience} onChange={(e) => set("teacher_experience", e.target.value)} className={field} placeholder="8 سنوات في التعليم المبكر" />
            </Row>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-foreground">معلمات إضافيات ومؤهلاتهن</p>
            <button
              type="button"
              onClick={() => set("teachers", [...draft.teachers, { name: "", title: "", qualification: "", experience: "" }])}
              className="inline-flex items-center gap-1 rounded-2xl border border-border/60 px-3 py-1.5 text-[11px] font-extrabold text-primary"
            >
              <Plus className="size-3.5" /> إضافة معلمة
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {draft.teachers.map((teacher, index) => (
              <div key={index} className="grid gap-2 rounded-2xl bg-muted/30 p-3 sm:grid-cols-4">
                <input
                  value={teacher.name}
                  placeholder="الاسم"
                  onChange={(e) =>
                    set("teachers", draft.teachers.map((t, i) => (i === index ? { ...t, name: e.target.value } : t)))
                  }
                  className={field}
                />
                <input
                  value={teacher.title ?? ""}
                  placeholder="الصفة"
                  onChange={(e) =>
                    set("teachers", draft.teachers.map((t, i) => (i === index ? { ...t, title: e.target.value } : t)))
                  }
                  className={field}
                />
                <input
                  value={teacher.qualification ?? ""}
                  placeholder="المؤهل"
                  onChange={(e) =>
                    set("teachers", draft.teachers.map((t, i) => (i === index ? { ...t, qualification: e.target.value } : t)))
                  }
                  className={field}
                />
                <div className="flex items-center gap-2">
                  <input
                    value={teacher.experience ?? ""}
                    placeholder="الخبرة"
                    onChange={(e) =>
                      set("teachers", draft.teachers.map((t, i) => (i === index ? { ...t, experience: e.target.value } : t)))
                    }
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => set("teachers", draft.teachers.filter((_, i) => i !== index))}
                    className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {draft.teachers.length === 0 ? (
              <p className="text-[11px] font-bold text-muted-foreground">لا توجد معلمات إضافيات.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-foreground">اليوم الدراسي بالتفصيل</p>
            <button
              type="button"
              onClick={() => set("daily_schedule", [...draft.daily_schedule, { time: "", activity: "" }])}
              className="inline-flex items-center gap-1 rounded-2xl border border-border/60 px-3 py-1.5 text-[11px] font-extrabold text-primary"
            >
              <Plus className="size-3.5" /> إضافة فقرة
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {draft.daily_schedule.map((slot, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={slot.time}
                  placeholder="7:00 ص"
                  onChange={(e) =>
                    set("daily_schedule", draft.daily_schedule.map((s, i) => (i === index ? { ...s, time: e.target.value } : s)))
                  }
                  className={`${field} max-w-[140px]`}
                />
                <input
                  value={slot.activity}
                  placeholder="الاستقبال والحلقة الصباحية"
                  onChange={(e) =>
                    set("daily_schedule", draft.daily_schedule.map((s, i) => (i === index ? { ...s, activity: e.target.value } : s)))
                  }
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => set("daily_schedule", draft.daily_schedule.filter((_, i) => i !== index))}
                  className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            {draft.daily_schedule.length === 0 ? (
              <p className="text-[11px] font-bold text-muted-foreground">لم تُضف فقرات لليوم الدراسي بعد.</p>
            ) : null}
          </div>
        </div>

        {draft.min_age_months >= draft.max_age_months ? (
          <p className="mt-4 text-[11px] font-extrabold text-destructive">
            نطاق العمر غير صحيح: يجب أن يكون أقل عمر أصغر من أعلى عمر.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-bold">
            إلغاء
          </button>
          <button
            type="button"
            disabled={busy || invalid}
            onClick={() => onSubmit(draft)}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {draft.id ? "حفظ التعديلات" : "إنشاء الفصل"}
          </button>
        </div>
      </div>
    </div>
  );
}
