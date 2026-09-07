/**
 * Full professional editor for one student record, opened from the official
 * student file page. Reuses the Student Affairs data-sheet update endpoint.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { amsStudentUpdate, amsStudents } from "@/features/ams/ams.functions";
import type { StudentRecord } from "@/features/ams/student-import";

type Student = Awaited<ReturnType<typeof amsStudents>>["students"][number];
type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  name_ar: "",
  name_en: "",
  national_id: "",
  gender: "male",
  birth_date: "",
  nationality: "سعودي",
  birth_place: "",
  stage_id: "",
  classroom_id: "",
  blood_type: "",
  medical_conditions: "",
  allergies: "",
  special_needs: "",
  previous_school: "",
  last_grade: "",
  vaccination_status: "",
  parent_name: "",
  parent_relationship: "الأب",
  parent_national_id: "",
  parent_nationality: "سعودي",
  parent_phone: "",
  parent_email: "",
  notes: "",
};

const trimmed = (value: string) => {
  const v = value.trim();
  return v ? v : null;
};

function toRecord(form: FormState): StudentRecord | { error: string } {
  if (form.name_ar!.trim().length < 3) return { error: "اسم الطالب مطلوب (٣ أحرف على الأقل)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date!.trim()))
    return { error: "تاريخ الميلاد مطلوب بصيغة YYYY-MM-DD." };
  if (!form.stage_id) return { error: "اختر المرحلة." };
  if (form.parent_name!.trim().length < 3) return { error: "اسم ولي الأمر مطلوب." };
  if (form.parent_phone!.trim().length < 9) return { error: "جوال ولي الأمر مطلوب." };

  return {
    name_ar: form.name_ar!.trim(),
    name_en: trimmed(form.name_en!),
    national_id: trimmed(form.national_id!),
    gender: form.gender === "female" ? "female" : "male",
    birth_date: form.birth_date!.trim(),
    nationality: trimmed(form.nationality!),
    birth_place: trimmed(form.birth_place!),
    stage_id: form.stage_id!,
    classroom_id: form.classroom_id ? form.classroom_id : null,
    blood_type: trimmed(form.blood_type!),
    medical_conditions: trimmed(form.medical_conditions!),
    allergies: trimmed(form.allergies!),
    special_needs: trimmed(form.special_needs!),
    previous_school: trimmed(form.previous_school!),
    last_grade: trimmed(form.last_grade!),
    vaccination_status: trimmed(form.vaccination_status!),
    parent_name: form.parent_name!.trim(),
    parent_relationship: trimmed(form.parent_relationship!),
    parent_national_id: trimmed(form.parent_national_id!),
    parent_nationality: trimmed(form.parent_nationality!),
    parent_phone: form.parent_phone!.trim(),
    parent_email: trimmed(form.parent_email!),
    notes: trimmed(form.notes!),
  };
}

function fromStudent(student: Student): FormState {
  return {
    ...EMPTY_FORM,
    name_ar: student.name_ar ?? "",
    name_en: student.name_en ?? "",
    national_id: student.national_id ?? "",
    gender: student.gender === "female" ? "female" : "male",
    birth_date: student.birth_date ?? "",
    nationality: student.nationality ?? "",
    birth_place: student.birth_place ?? "",
    stage_id: student.stage_id ?? "",
    classroom_id: student.classroom_id ?? "",
    blood_type: student.blood_type ?? "",
    medical_conditions: student.medical_conditions ?? "",
    allergies: student.allergies ?? "",
    special_needs: student.special_needs ?? "",
    previous_school: student.previous_school ?? "",
    last_grade: student.last_grade ?? "",
    vaccination_status: student.vaccination_status ?? "",
    parent_name: student.parentName === "—" ? "" : (student.parentName ?? ""),
    parent_relationship: student.parentRelationship ?? "",
    parent_national_id: student.parentNationalId ?? "",
    parent_nationality: student.parentNationality ?? "",
    parent_phone: student.parentPhone ?? "",
    parent_email: student.parentEmail ?? "",
    notes: "",
  };
}

const LTR_KEYS = [
  "national_id",
  "parent_national_id",
  "parent_phone",
  "parent_email",
  "birth_date",
];

export function StudentEditDialog({
  childId,
  open,
  onOpenChange,
}: {
  childId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const load = useServerFn(amsStudents);
  const updateOne = useServerFn(amsStudentUpdate);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "students", "sheet"],
    queryFn: () => load({ data: {} }),
    enabled: open,
  });

  const student = useMemo(
    () => (data?.students ?? []).find((s) => s.id === childId) ?? null,
    [data?.students, childId],
  );

  useEffect(() => {
    if (open && student) setForm(fromStudent(student));
    if (!open) setForm(null);
  }, [open, student]);

  const save = useMutation({
    mutationFn: (record: StudentRecord) => updateOne({ data: { childId, record } }),
    onSuccess: () => {
      toast.success("تم تحديث بيانات الطالب");
      void queryClient.invalidateQueries({ queryKey: ["ams", "student-file", childId] });
      void queryClient.invalidateQueries({ queryKey: ["ams", "student-profile", childId] });
      void queryClient.invalidateQueries({ queryKey: ["ams", "students"] });
      void queryClient.invalidateQueries({ queryKey: ["ams", "seats"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: string, value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const stages = data?.stages ?? [];
  const classrooms = data?.classrooms ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">
            تعديل بيانات {student?.name_ar ?? "الطالب"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            التعديل يسري مباشرة على الملف الرسمي وسجل شؤون الطلاب.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-2xl bg-destructive/10 p-4 text-xs font-bold text-destructive">
            {(error as Error).message}
          </p>
        ) : isLoading || !form ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-bold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            جارٍ تحميل بيانات الطالب…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name_ar", "اسم الطالب (رباعي) *"],
                ["name_en", "الاسم بالإنجليزية"],
                ["national_id", "هوية / إقامة الطالب"],
                ["birth_date", "تاريخ الميلاد * (YYYY-MM-DD)"],
                ["nationality", "الجنسية"],
                ["birth_place", "مكان الميلاد"],
                ["blood_type", "فصيلة الدم"],
                ["previous_school", "المدرسة السابقة"],
                ["last_grade", "آخر صف"],
                ["vaccination_status", "حالة التحصينات"],
                ["parent_name", "اسم ولي الأمر *"],
                ["parent_relationship", "صلة القرابة"],
                ["parent_national_id", "هوية ولي الأمر"],
                ["parent_nationality", "جنسية ولي الأمر"],
                ["parent_phone", "جوال ولي الأمر *"],
                ["parent_email", "البريد الإلكتروني"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-[11px] font-black text-muted-foreground">{label}</span>
                <Input
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-10 rounded-xl text-xs font-bold"
                  dir={LTR_KEYS.includes(key) ? "ltr" : undefined}
                />
              </label>
            ))}

            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-muted-foreground">الجنس *</span>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-muted-foreground">المرحلة *</span>
              <select
                value={form.stage_id}
                onChange={(e) => {
                  set("stage_id", e.target.value);
                  set("classroom_id", "");
                }}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
              >
                <option value="">اختر المرحلة</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_ar}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-muted-foreground">الفصل</span>
              <select
                value={form.classroom_id}
                onChange={(e) => set("classroom_id", e.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
              >
                <option value="">بدون فصل</option>
                {classrooms
                  .filter((c) => !form.stage_id || c.stage_id === form.stage_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
              </select>
            </label>

            {(
              [
                ["medical_conditions", "حالات صحية"],
                ["allergies", "حساسية"],
                ["special_needs", "احتياجات خاصة"],
                ["notes", "ملاحظات"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1.5">
                <span className="text-[11px] font-black text-muted-foreground">{label}</span>
                <Textarea
                  value={form[key] ?? ""}
                  onChange={(e) => set(key, e.target.value)}
                  className="min-h-[64px] rounded-xl text-xs"
                />
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            className="rounded-xl text-xs font-bold"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            className="rounded-xl text-xs font-bold"
            disabled={!form || save.isPending}
            onClick={() => {
              if (!form) return;
              const result = toRecord(form);
              if ("error" in result) {
                toast.error(result.error);
                return;
              }
              save.mutate(result);
            }}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
