/**
 * Parent view of academic reports — weekly / monthly / end-of-term, with the
 * digital evidence attached by the teacher. A classroom's reports only appear
 * here when the teacher enabled "show to parents" for that classroom.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff, FileText, Film, ImageIcon, Link as LinkIcon, Loader2, Printer } from "lucide-react";
import { useState } from "react";

import { MediaViewerDialog, type MediaItem } from "@/components/media/MediaViewerDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EVIDENCE_KIND_LABELS_AR, SCALE_LABELS, TRIANGLE_LABELS } from "../assessments";
import { REPORT_TYPE_LABELS, masteryLabel, type ReportType } from "../reports";
import { academicsParentReportBoard } from "../reports.functions";
import { EvaluationGuide } from "./EvaluationGuide";
import { EvaluationTriangle } from "./EvaluationTriangle";


const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #child-report, #child-report * { visibility: visible !important; }
  #child-report { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
  @page { size: A4 portrait; margin: 12mm; }
}
`;

const TYPES: ReportType[] = ["weekly", "monthly", "term"];

export function ChildReports() {
  const loadBoard = useServerFn(academicsParentReportBoard);
  const [childId, setChildId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("monthly");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["parent-academic-report", childId, reportType],
    queryFn: () => loadBoard({ data: { childId, reportType } }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-8 text-center text-sm font-bold text-foreground">
        {error instanceof Error ? error.message : "تعذّر تحميل التقارير."}
      </Card>
    );
  }

  const children = data.children;
  if (!children.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لا يوجد أبناء مسجّلون في فصول حتى الآن، لذلك لا تتوفر تقارير أكاديمية.
      </Card>
    );
  }

  const active = children.find((c) => c.childId === data.selectedChildId) ?? children[0]!;

  return (
    <div className="space-y-5">
      <style>{PRINT_CSS}</style>

      <Card className="flex flex-wrap items-center gap-2 p-3 print:hidden">
        {children.map((child) => {
          const isActive = child.childId === active.childId;
          return (
            <button
              key={child.childId}
              type="button"
              onClick={() => setChildId(child.childId)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {child.childName}
              {child.classroomName ? ` — ${child.classroomName}` : ""}
            </button>
          );
        })}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setReportType(t)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
                reportType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {REPORT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <Button
          type="button"
          className="font-black"
          disabled={!active.visible}
          onClick={() => window.print()}
        >
          <Printer className="me-2 h-4 w-4" />
          طباعة / حفظ PDF
        </Button>
      </Card>

      {!active.visible ? (
        <Card className="space-y-2 p-10 text-center">
          <EyeOff className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-black text-foreground">
            تقارير فصل {active.classroomName ?? "طفلك"} غير متاحة للعرض حاليًا.
          </p>
          <p className="text-xs font-bold text-muted-foreground">
            ستظهر التقارير هنا مباشرة بعد إتاحتها من المعلمة.
          </p>
        </Card>
      ) : (
        <div
          id="child-report"
          dir="rtl"
          className="space-y-6 rounded-3xl border border-border/60 bg-card p-6"
        >
          <header className="space-y-1 border-b border-border/60 pb-4 text-center">
            <p className="text-xs font-bold text-muted-foreground">روضة ومدارس المنال — عنيزة</p>
            <h2 className="text-xl font-black text-primary">
              {REPORT_TYPE_LABELS[data.reportType]} — {active.childName}
            </h2>
            <p className="text-xs font-bold text-muted-foreground">{data.periodLabel}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {active.stageName ?? "—"} · {active.classroomName ?? "—"}
              {active.studentNumber ? ` · ${active.studentNumber}` : ""}
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

          <section className="rounded-2xl border border-border/50 bg-background/60 p-3">
            <p className="mb-2 text-[11px] font-black text-foreground">مفتاح ألوان الأشهر</p>
            <div className="flex flex-wrap gap-2">
              {data.monthColors.map((m) => (
                <span
                  key={m.month}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-2 py-1 text-[10px] font-bold"
                >
                  <span className="size-3 rounded-full" style={{ background: m.hex }} />
                  {m.label}
                </span>
              ))}
            </div>
          </section>

          {!data.subjects.length ? (
            <p className="rounded-2xl border-2 border-dashed border-border/60 p-8 text-center text-sm font-bold text-muted-foreground">
              لم يتم إضافة مواد لهذا الفصل بعد.
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
                    <div className="overflow-x-auto rounded-2xl border border-border/60">
                      <table className="w-full min-w-[640px] text-right text-xs">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="p-2 font-black">الدرس</th>
                            <th className="p-2 font-black">{SCALE_LABELS.performance}</th>
                            <th className="p-2 font-black">{SCALE_LABELS.growth}</th>
                            <th className="p-2 font-black">ملاحظة المعلمة</th>
                            <th className="p-2 font-black">الأدلة والشواهد</th>
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
                                            className="h-12 w-12 rounded-md object-cover"
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
                                  <span className="text-[11px] font-bold text-muted-foreground">
                                    —
                                  </span>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-center">
      <p className="text-lg font-black text-primary">{value}</p>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
    </div>
  );
}
