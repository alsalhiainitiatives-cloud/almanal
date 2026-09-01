/**
 * Academic Reports — filters + a read-only, printable child report.
 *
 * A teacher only sees her assigned classrooms; school administration sees every
 * classroom and child. The report renders the exact triangle states and line
 * colours saved in the database, plus links/thumbnails for uploaded evidence.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, FileText, Film, ImageIcon, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SCALE_LABELS, TRIANGLE_LABELS } from "../assessments";
import { REPORT_TYPE_LABELS, masteryLabel, type ReportBoard, type ReportType } from "../reports";
import { academicsReportBoard, academicsSetReportsVisible } from "../reports.functions";
import { EvaluationTriangle } from "./EvaluationTriangle";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #academic-report, #academic-report * { visibility: visible !important; }
  #academic-report { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
`;

const ALL = "__all__";

export function AcademicReports() {
  const [stageId, setStageId] = useState<string>(ALL);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("monthly");

  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(academicsReportBoard);
  const setVisible = useServerFn(academicsSetReportsVisible);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["academic-report", classroomId, childId, reportType],
    queryFn: () => fetchBoard({ data: { classroomId, childId, reportType } }) as Promise<ReportBoard>,
  });

  const visibility = useMutation({
    mutationFn: (vars: { classroomId: string; visible: boolean }) =>
      setVisible({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(
        vars.visible
          ? "تم إظهار تقارير هذا الفصل لأولياء الأمور."
          : "تم إخفاء تقارير هذا الفصل عن أولياء الأمور.",
      );
      void queryClient.invalidateQueries({ queryKey: ["academic-report"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "تعذّر تحديث إظهار التقارير."),
  });

  const stages = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.classrooms ?? []) if (c.stageId) map.set(c.stageId, c.stageNameAr);
    return [...map.entries()].map(([id, nameAr]) => ({ id, nameAr }));
  }, [data?.classrooms]);

  const classrooms = (data?.classrooms ?? []).filter(
    (c) => stageId === ALL || c.stageId === stageId,
  );

  if (isLoading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-border/60 bg-card p-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-destructive/40 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">
          {error instanceof Error ? error.message : "تعذّر تحميل التقارير."}
        </p>
      </div>
    );
  }

  const activeClassroom = data.selectedClassroomId;
  const activeChild = data.selectedChildId;

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      {/* Filters */}
      <div className="grid gap-3 rounded-3xl border border-border/60 bg-card p-4 print:hidden md:grid-cols-5">
        <Field label="المرحلة">
          <Select
            value={stageId}
            onValueChange={(v) => {
              setStageId(v);
              setClassroomId(null);
              setChildId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="كل المراحل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل المراحل</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="الفصل">
          <Select
            value={activeClassroom ?? ""}
            onValueChange={(v) => {
              setClassroomId(v);
              setChildId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختاري الفصل" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nameAr} — {c.stageNameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="الطفل">
          <Select value={activeChild ?? ""} onValueChange={(v) => setChildId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="اختاري الطفل" />
            </SelectTrigger>
            <SelectContent>
              {data.children.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nameAr}
                  {c.studentNumber ? ` — ${c.studentNumber}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="نوع التقرير">
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-end">
          <Button
            type="button"
            className="w-full font-black"
            disabled={!data.child}
            onClick={() => window.print()}
          >
            <Printer className="me-2 h-4 w-4" />
            تصدير PDF / طباعة
          </Button>
        </div>
      </div>

      {!data.child ? (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">
            لا يوجد أطفال مسجّلون في هذا الفصل لإصدار تقرير.
          </p>
        </div>
      ) : (
        <div
          id="academic-report"
          dir="rtl"
          className="space-y-6 rounded-3xl border border-border/60 bg-card p-6"
        >
          <header className="space-y-1 border-b border-border/60 pb-4 text-center">
            <p className="text-xs font-bold text-muted-foreground">روضة ومدارس المنال — عنيزة</p>
            <h2 className="text-xl font-black text-primary">
              {REPORT_TYPE_LABELS[data.reportType]} — {data.child.nameAr}
            </h2>
            <p className="text-xs font-bold text-muted-foreground">{data.periodLabel}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {data.stageNameAr} · {data.classroomNameAr}
              {data.child.studentNumber ? ` · ${data.child.studentNumber}` : ""}
              {data.teacherNames.length ? ` · المعلمة: ${data.teacherNames.join("، ")}` : ""}
            </p>
          </header>

          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="دروس المنهج" value={data.summary.lessons} />
            <Stat label="تم رصدها" value={data.summary.evaluated} />
            <Stat label="أتقن" value={data.summary.mastered} />
            <Stat label="يتدرّب" value={data.summary.practicing} />
            <Stat label="أدلة رقمية" value={data.summary.evidences} />
          </section>

          {/* Colour legend from settings */}
          <section className="rounded-2xl border border-border/50 bg-background/60 p-3">
            <p className="mb-2 text-[11px] font-black text-foreground">مفتاح ألوان الأشهر</p>
            <div className="flex flex-wrap gap-2">
              {data.monthColors.map((m) => (
                <span
                  key={m.month}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-bold"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border/60"
                    style={{ background: m.hex }}
                  />
                  {m.label}
                </span>
              ))}
            </div>
          </section>

          {data.subjects.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-muted-foreground">
              لا يوجد منهج معرّف لهذا الفصل بعد.
            </p>
          ) : (
            data.subjects.map((subject) => (
              <section key={subject.id} className="space-y-3">
                <h3
                  className="rounded-xl px-3 py-1.5 text-sm font-black text-white"
                  style={{ background: subject.colorHex }}
                >
                  {subject.nameAr}
                </h3>
                {subject.topics.map((topic) => (
                  <div key={topic.id} className="space-y-2">
                    <p className="text-xs font-black text-muted-foreground">{topic.nameAr}</p>
                    <div className="overflow-hidden rounded-2xl border border-border/60">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="p-2 font-black">الدرس</th>
                            <th className="p-2 font-black">{SCALE_LABELS.performance}</th>
                            <th className="p-2 font-black">{SCALE_LABELS.growth}</th>
                            <th className="p-2 font-black">ملاحظة المعلمة</th>
                            <th className="p-2 font-black">الأدلة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topic.lessons.map((lesson) => (
                            <tr key={lesson.id} className="border-t border-border/50 align-top">
                              <td className="p-2 font-bold">{lesson.nameAr}</td>
                              <td className="p-2">
                                <Cell
                                  scale="performance"
                                  level={lesson.cell?.performanceLevel ?? 0}
                                  colors={lesson.cell?.performanceColors ?? []}
                                />
                              </td>
                              <td className="p-2">
                                <Cell
                                  scale="growth"
                                  level={lesson.cell?.growthLevel ?? 0}
                                  colors={lesson.cell?.growthColors ?? []}
                                />
                              </td>
                              <td className="p-2 text-[11px] font-bold text-muted-foreground">
                                {lesson.cell?.note ?? "—"}
                              </td>
                              <td className="p-2">
                                {lesson.cell?.evidences.length ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {lesson.cell.evidences.map((ev) => (
                                      <a
                                        key={ev.id}
                                        href={ev.url ?? "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-border/60 p-1 text-[10px] font-bold hover:border-primary/50"
                                      >
                                        {ev.fileType === "image" && ev.url ? (
                                          <img
                                            src={ev.url}
                                            alt={ev.fileName ?? "دليل"}
                                            className="h-10 w-10 rounded-md object-cover"
                                          />
                                        ) : ev.fileType === "video" ? (
                                          <Film className="h-4 w-4" />
                                        ) : ev.fileType === "image" ? (
                                          <ImageIcon className="h-4 w-4" />
                                        ) : (
                                          <FileText className="h-4 w-4" />
                                        )}
                                        <span className="max-w-[90px] truncate">
                                          {ev.fileName ?? "ملف"}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}

          <footer className="border-t border-border/60 pt-3 text-center text-[10px] font-bold text-muted-foreground">
            تقرير غير قابل للتعديل — صادر من نظام التتبع الأكاديمي بروضة ومدارس المنال
          </footer>
        </div>
      )}
    </div>
  );
}

function Cell({
  scale,
  level,
  colors,
}: {
  scale: "performance" | "growth";
  level: 0 | 1 | 2 | 3;
  colors: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <EvaluationTriangle scale={scale} level={level} colors={colors} size={36} readOnly />
      <span className="text-[11px] font-bold text-muted-foreground">
        {level === 0 ? masteryLabel(0) : TRIANGLE_LABELS[scale][level]}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-black text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-background/60 p-3 text-center")}>
      <p className="text-lg font-black text-primary">{value}</p>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
