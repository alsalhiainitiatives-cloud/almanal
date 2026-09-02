/**
 * Student Affairs data sheet: Excel import (template → upload → review →
 * approve), spreadsheet-style add/edit/delete, and export to Excel / CSV / PDF.
 */
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  amsStudentAdd,
  amsStudentDelete,
  amsStudentUpdate,
  amsStudents,
  amsStudentsImport,
} from "@/features/ams/ams.functions";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { exportCsv, exportExcel, exportPdf, type Column } from "@/features/ams/reports-export";
import {
  IMPORT_COLUMNS,
  downloadImportTemplate,
  parseImportFile,
  validateRow,
  type StudentRecord,
  type ValidatedRow,
} from "@/features/ams/student-import";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";

const KEY = ["ams", "students", "sheet"];

type Student = Awaited<ReturnType<typeof amsStudents>>["students"][number];

const EXPORT_COLUMNS: Column[] = [
  { key: "number", label: "الرقم الأكاديمي" },
  { key: "name_ar", label: "اسم الطالب" },
  { key: "name_en", label: "الاسم بالإنجليزية" },
  { key: "national_id", label: "هوية الطالب" },
  { key: "gender", label: "الجنس" },
  { key: "birth_date", label: "تاريخ الميلاد" },
  { key: "nationality", label: "الجنسية" },
  { key: "stage", label: "المرحلة" },
  { key: "classroom", label: "الفصل" },
  { key: "academic_year", label: "العام الدراسي" },
  { key: "blood_type", label: "فصيلة الدم" },
  { key: "medical_conditions", label: "حالات صحية" },
  { key: "allergies", label: "حساسية" },
  { key: "special_needs", label: "احتياجات خاصة" },
  { key: "previous_school", label: "المدرسة السابقة" },
  { key: "parent_name", label: "ولي الأمر" },
  { key: "parent_phone", label: "الجوال" },
  { key: "parent_email", label: "البريد" },
  { key: "parent_national_id", label: "هوية ولي الأمر" },
];

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

export function StudentDataBoard() {
  const { roles } = useAuth();
  const canManage = (roles as string[]).some((r) =>
    ["admin", "supervisor", "principal", "registration_officer"].includes(r),
  );
  const canDelete = (roles as string[]).some((r) => ["admin", "supervisor", "principal"].includes(r));

  const load = useServerFn(amsStudents);
  const runImport = useServerFn(amsStudentsImport);
  const addOne = useServerFn(amsStudentAdd);
  const updateOne = useServerFn(amsStudentUpdate);
  const deleteOne = useServerFn(amsStudentDelete);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: () => load({ data: {} }) });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ams", "students"] });
    queryClient.invalidateQueries({ queryKey: ["ams", "seats"] });
  };

  const stages = data?.stages ?? [];
  const classrooms = data?.classrooms ?? [];
  const students = data?.students ?? [];

  const currentYear = useMemo(() => {
    const years = [...new Set(students.map((s) => s.academicYear).filter(Boolean))];
    if (years.length) return years.sort().at(-1) as string;
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
  }, [students]);

  const [academicYear, setAcademicYear] = useState<string>("");
  const year = academicYear || currentYear;

  /* ------------------------------ import ------------------------------ */
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ValidatedRow[] | null>(null);
  const [fileName, setFileName] = useState("");

  const validRows = (preview ?? []).filter((r) => r.record);
  const badRows = (preview ?? []).filter((r) => !r.record);

  async function onPickFile(file: File) {
    setParsing(true);
    try {
      const raw = await parseImportFile(file);
      if (!raw.length) throw new Error("لم يتم العثور على بيانات في الملف.");
      const rows = raw.map((r, i) => validateRow(r, i + 1, stages, classrooms));
      setPreview(rows);
      setFileName(file.name);
      toast.success(`تمت قراءة ${rows.length} صفًا — راجع البيانات قبل الاعتماد.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر قراءة الملف.");
    } finally {
      setParsing(false);
    }
  }

  const importMutation = useMutation({
    mutationFn: () =>
      runImport({
        data: { academicYear: year, records: validRows.map((r) => r.record as StudentRecord) },
      }),
    onSuccess: (result) => {
      invalidate();
      setPreview(null);
      setFileName("");
      toast.success(`تم استيراد ${result.imported} طالب/طالبة${result.failed ? ` — تعذّر ${result.failed}` : ""}`);
      if (result.failed) {
        result.results
          .filter((r) => !r.ok)
          .slice(0, 5)
          .forEach((r) => toast.error(`${r.name}: ${r.message ?? "خطأ"}`));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ------------------------------ sheet CRUD ------------------------------ */
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [editing, setEditing] = useState<{ student: Student | null; form: FormState } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter((s) => {
      if (stageFilter && s.stage_id !== stageFilter) return false;
      if (classFilter && s.classroom_id !== classFilter) return false;
      if (!needle) return true;
      return [s.name_ar, s.national_id, s.studentNumber, s.parentName, s.parentPhone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [students, q, stageFilter, classFilter]);

  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name_ar ?? "—";
  const className = (id: string | null) => classrooms.find((c) => c.id === id)?.name_ar ?? "—";

  const saveMutation = useMutation({
    mutationFn: async (payload: { student: Student | null; record: StudentRecord }) =>
      payload.student
        ? updateOne({ data: { childId: payload.student.id, record: payload.record } })
        : addOne({ data: { academicYear: year, record: payload.record } }),
    onSuccess: (_r, payload) => {
      invalidate();
      setEditing(null);
      toast.success(payload.student ? "تم تحديث بيانات الطالب." : "تم إضافة الطالب وإصدار رقمه الأكاديمي.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (childId: string) => deleteOne({ data: { childId } }),
    onSuccess: () => {
      invalidate();
      setPendingDelete(null);
      toast.success("تم حذف سجل الطالب.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ------------------------------ export ------------------------------ */
  const exportRows = filtered.map((s) => ({
    number: s.studentNumber ?? s.applicationNumber ?? "—",
    name_ar: s.name_ar,
    name_en: s.name_en ?? "",
    national_id: s.national_id ?? "",
    gender: s.gender === "female" ? "أنثى" : "ذكر",
    birth_date: s.birth_date ?? "",
    nationality: s.nationality ?? "",
    stage: stageName(s.stage_id),
    classroom: className(s.classroom_id),
    academic_year: s.academicYear ?? "",
    blood_type: s.blood_type ?? "",
    medical_conditions: s.medical_conditions ?? "",
    allergies: s.allergies ?? "",
    special_needs: s.special_needs ?? "",
    previous_school: s.previous_school ?? "",
    parent_name: s.parentName ?? "",
    parent_phone: s.parentPhone ?? "",
    parent_email: s.parentEmail ?? "",
    parent_national_id: s.parentNationalId ?? "",
  }));

  const scopeLabel = [
    stageFilter ? stageName(stageFilter) : "كل المراحل",
    classFilter ? className(classFilter) : "كل الفصول",
  ].join(" · ");

  if (error) return <EmptyState title="تعذّر التحميل" description={(error as Error).message} />;
  if (isLoading || !data) return <SkeletonRows rows={6} />;

  return (
    <Tabs defaultValue="import" className="space-y-4">
      <TabsList className="h-auto flex-wrap rounded-2xl">
        <TabsTrigger value="import" className="rounded-xl text-xs font-bold">
          استيراد من إكسل
        </TabsTrigger>
        <TabsTrigger value="sheet" className="rounded-xl text-xs font-bold">
          جدول الطلاب ({students.length})
        </TabsTrigger>
        <TabsTrigger value="export" className="rounded-xl text-xs font-bold">
          تصدير البيانات
        </TabsTrigger>
      </TabsList>

      {/* ------------------------------- IMPORT ------------------------------- */}
      <TabsContent value="import" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-border/60 bg-card p-5">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Download className="size-5" />
            </span>
            <h3 className="mt-3 text-sm font-black text-foreground">١. حمّل نموذج الإكسل</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ملف منسّق بالكامل بحقول النظام نفسها، مع قوائم منسدلة للمرحلة والفصل والجنس وورقة
              تعليمات.
            </p>
            <div className="mt-3 space-y-2">
              <label className="text-[11px] font-black text-muted-foreground">العام الدراسي</label>
              <Input
                value={year}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="h-10 rounded-xl text-xs font-bold"
                dir="ltr"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl text-xs font-bold"
                onClick={() =>
                  downloadImportTemplate(
                    stages.map((s) => ({ id: s.id, name_ar: s.name_ar })),
                    classrooms.map((c) => ({ id: c.id, name_ar: c.name_ar, stage_id: c.stage_id })),
                    year,
                  ).catch(() => toast.error("تعذّر إنشاء النموذج."))
                }
              >
                <FileSpreadsheet className="size-4" />
                تحميل النموذج (xlsx)
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="size-5" />
            </span>
            <h3 className="mt-3 text-sm font-black text-foreground">٢. ارفع الملف المعبّأ</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              يقرأ النظام الصفوف ويتحقق من كل حقل قبل الاعتماد — لا يُدخل أي سجل قبل مراجعتك.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              className="mt-3 w-full rounded-xl text-xs font-bold"
              disabled={parsing || !canManage}
              onClick={() => fileRef.current?.click()}
            >
              {parsing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              اختيار ملف الاستيراد
            </Button>
            {fileName ? (
              <p className="mt-2 truncate text-[11px] font-bold text-muted-foreground">{fileName}</p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-5" />
            </span>
            <h3 className="mt-3 text-sm font-black text-foreground">٣. راجع ثم اعتمد</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              يصدر النظام رقمًا أكاديميًا لكل طالب حسب المرحلة والعام الدراسي وترتيبه، ويضيفه
              مباشرة إلى سجل الطلاب والفصول.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="rounded-xl bg-emerald-500/10 px-3 py-1.5 text-emerald-700">
                صفوف صالحة: {validRows.length}
              </span>
              <span className="rounded-xl bg-destructive/10 px-3 py-1.5 text-destructive">
                تحتاج تصحيح: {badRows.length}
              </span>
            </div>
            <Button
              type="button"
              className="mt-3 w-full rounded-xl text-xs font-bold"
              disabled={!validRows.length || importMutation.isPending || !canManage}
              onClick={() => importMutation.mutate()}
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              اعتماد استيراد {validRows.length} طالب
            </Button>
          </div>
        </div>

        {preview ? (
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <table className="w-full min-w-[1100px] text-start text-xs">
              <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-start">#</th>
                  <th className="px-3 py-3 text-start">الحالة</th>
                  {IMPORT_COLUMNS.slice(0, 9).map((c) => (
                    <th key={c.key} className="px-3 py-3 text-start">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-start">ولي الأمر</th>
                  <th className="px-3 py-3 text-start">الجوال</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={row.index}
                    className={cn(
                      "border-t border-border/50",
                      row.record ? "hover:bg-muted/25" : "bg-destructive/5",
                    )}
                  >
                    <td className="px-3 py-2 font-bold">{row.index}</td>
                    <td className="px-3 py-2">
                      {row.record ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 font-black text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> جاهز
                        </span>
                      ) : (
                        <span className="inline-flex items-start gap-1 rounded-lg bg-destructive/10 px-2 py-1 font-black text-destructive">
                          <TriangleAlert className="mt-0.5 size-3.5" />
                          <span className="max-w-[200px] leading-relaxed">
                            {row.errors.join(" · ")}
                          </span>
                        </span>
                      )}
                    </td>
                    {IMPORT_COLUMNS.slice(0, 9).map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {c.key === "stage"
                          ? row.stageName
                          : c.key === "classroom"
                            ? row.classroomName
                            : (row.raw[c.key] ?? "—") || "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2">{row.raw.parent_name || "—"}</td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.raw.parent_phone || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<FileSpreadsheet className="size-5" />}
            title="لم يتم رفع ملف بعد"
            description="حمّل النموذج، عبّئه في الإكسل، ثم ارفعه لتظهر البيانات هنا للمراجعة قبل الاعتماد."
          />
        )}
      </TabsContent>

      {/* ------------------------------- SHEET ------------------------------- */}
      <TabsContent value="sheet" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو الهوية أو الرقم الأكاديمي…"
              className="h-11 rounded-2xl ps-9 text-sm"
            />
          </div>
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setClassFilter("");
            }}
            className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
          >
            <option value="">كل المراحل</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_ar}
              </option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
          >
            <option value="">كل الفصول</option>
            {classrooms
              .filter((c) => !stageFilter || c.stage_id === stageFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
          </select>
          <Button
            type="button"
            className="rounded-2xl text-xs font-bold"
            disabled={!canManage}
            onClick={() => setEditing({ student: null, form: { ...EMPTY_FORM, stage_id: stageFilter } })}
          >
            <Plus className="size-4" />
            إضافة طالب
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="لا يوجد طلاب مطابقون" description="جرّب تغيير البحث أو الفلاتر." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <table className="w-full min-w-[1000px] text-start text-xs">
              <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-start">الرقم الأكاديمي</th>
                  <th className="px-3 py-3 text-start">الطالب</th>
                  <th className="px-3 py-3 text-start">الهوية</th>
                  <th className="px-3 py-3 text-start">الميلاد</th>
                  <th className="px-3 py-3 text-start">المرحلة / الفصل</th>
                  <th className="px-3 py-3 text-start">ولي الأمر</th>
                  <th className="px-3 py-3 text-start">العام</th>
                  <th className="px-3 py-3 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border/50 hover:bg-muted/25">
                    <td className="px-3 py-2 font-extrabold" dir="ltr">
                      {s.studentNumber ?? s.applicationNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-extrabold text-foreground">{s.name_ar}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.gender === "female" ? "أنثى" : "ذكر"} · {s.nationality ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {s.national_id ?? "—"}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {s.birth_date ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-bold text-foreground">{stageName(s.stage_id)}</span>
                      <span className="text-muted-foreground"> · {className(s.classroom_id)}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-foreground">{s.parentName}</p>
                      <p className="text-muted-foreground" dir="ltr">
                        {s.parentPhone ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {s.academicYear}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-[11px] font-bold"
                          disabled={!canManage}
                          onClick={() => setEditing({ student: s, form: fromStudent(s) })}
                        >
                          <Pencil className="size-3.5" />
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-[11px] font-bold text-destructive"
                          disabled={!canDelete}
                          onClick={() => setPendingDelete(s)}
                        >
                          <Trash2 className="size-3.5" />
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* ------------------------------- EXPORT ------------------------------- */}
      <TabsContent value="export" className="space-y-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-black text-foreground">نطاق التصدير</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            اختر المرحلة والفصل، ويصدّر النظام الطلاب المطابقين ({filtered.length} طالب/طالبة).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setClassFilter("");
              }}
              className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
            >
              <option value="">كل المراحل</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_ar}
                </option>
              ))}
            </select>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
            >
              <option value="">كل الفصول</option>
              {classrooms
                .filter((c) => !stageFilter || c.stage_id === stageFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => exportExcel("طلاب-المنال", `سجل الطلاب — ${scopeLabel}`, EXPORT_COLUMNS, exportRows)}
            >
              <FileSpreadsheet className="size-4" />
              تصدير إكسل
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => exportCsv("طلاب-المنال", EXPORT_COLUMNS, exportRows)}
            >
              <Download className="size-4" />
              تصدير CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => {
                const ok = exportPdf("سجل الطلاب", EXPORT_COLUMNS, exportRows, scopeLabel);
                if (!ok) toast.error("اسمح بالنوافذ المنبثقة لإتمام التصدير.");
              }}
            >
              <FileText className="size-4" />
              تصدير PDF
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* ------------------------------- dialogs ------------------------------- */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">
              {editing?.student ? `تعديل بيانات ${editing.student.name_ar}` : "إضافة طالب جديد"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing?.student
                ? "التعديل يسري على سجل الطالب وملفه الرسمي."
                : `سيُصدر النظام رقمًا أكاديميًا تلقائيًا للعام الدراسي ${year}.`}
            </DialogDescription>
          </DialogHeader>

          {editing ? (
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
                    value={editing.form[key] ?? ""}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, form: { ...prev.form, [key]: e.target.value } } : prev,
                      )
                    }
                    className="h-10 rounded-xl text-xs font-bold"
                    dir={["national_id", "parent_national_id", "parent_phone", "parent_email", "birth_date"].includes(key) ? "ltr" : undefined}
                  />
                </label>
              ))}

              <label className="space-y-1.5">
                <span className="text-[11px] font-black text-muted-foreground">الجنس *</span>
                <select
                  value={editing.form.gender}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, form: { ...prev.form, gender: e.target.value } } : prev,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[11px] font-black text-muted-foreground">المرحلة *</span>
                <select
                  value={editing.form.stage_id}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev
                        ? { ...prev, form: { ...prev.form, stage_id: e.target.value, classroom_id: "" } }
                        : prev,
                    )
                  }
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
                  value={editing.form.classroom_id}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, form: { ...prev.form, classroom_id: e.target.value } } : prev,
                    )
                  }
                  className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
                >
                  <option value="">بدون فصل</option>
                  {classrooms
                    .filter((c) => !editing.form.stage_id || c.stage_id === editing.form.stage_id)
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
                <label key={key} className="space-y-1.5 sm:col-span-1">
                  <span className="text-[11px] font-black text-muted-foreground">{label}</span>
                  <Textarea
                    value={editing.form[key] ?? ""}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, form: { ...prev.form, [key]: e.target.value } } : prev,
                      )
                    }
                    className="min-h-[64px] rounded-xl text-xs"
                  />
                </label>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" className="rounded-xl text-xs font-bold" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button
              className="rounded-xl text-xs font-bold"
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!editing) return;
                const result = toRecord(editing.form);
                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }
                saveMutation.mutate({ student: editing.student, record: result });
              }}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">حذف سجل الطالب</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              سيتم حذف «{pendingDelete?.name_ar}» وسجل تسجيله نهائيًا، ويُحرَّر مقعده في الفصل. لا يمكن
              التراجع عن هذه العملية.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl text-xs font-bold" onClick={() => setPendingDelete(null)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl text-xs font-bold"
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
