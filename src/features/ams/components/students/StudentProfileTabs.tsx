/**
 * Student Affairs — per-child detail tabs.
 *
 * Academic placement, attendance, curriculum assessments and attached media,
 * next to the official printable student file.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, Images, Sparkles } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MediaViewerDialog, type MediaItem } from "@/components/media/MediaViewerDialog";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { amsStudentProfile } from "@/features/ams/student-profile.functions";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  ATTENDANCE_STYLES,
  attendanceRate,
  type AttendanceStatus,
} from "@/features/ams/attendance";
import { masteryLabel } from "@/features/academics/reports";
import { EvaluationTriangle } from "@/features/academics/components/EvaluationTriangle";
import type { StudentFileData } from "@/features/ams/student-file";
import { cn } from "@/lib/utils";

const currentMonth = () => new Date().toISOString().slice(0, 7);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StudentProfileTabs({
  childId,
  file,
  children: officialFile,
}: {
  childId: string;
  file: StudentFileData;
  children: React.ReactNode;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [viewer, setViewer] = useState<MediaItem | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "student-profile", childId, month],
    queryFn: () => amsStudentProfile({ data: { childId, month } }),
  });

  const mediaItems = useMemo<MediaItem[]>(
    () => (data?.media ?? []).map((m) => ({ url: m.url, kind: m.kind, name: m.name ?? m.context })),
    [data?.media],
  );
  void mediaItems;

  const rate = data ? attendanceRate(data.attendance.counts) : null;
  const yearRate = data ? attendanceRate(data.attendance.yearCounts) : null;

  return (
    <>
      <Tabs defaultValue="academic" className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-2xl no-print">
          <TabsTrigger value="academic" className="rounded-xl text-xs font-bold">
            <Sparkles className="size-3.5" />
            البيانات الأكاديمية
          </TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl text-xs font-bold">
            <CalendarDays className="size-3.5" />
            الحضور والغياب
          </TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-xl text-xs font-bold">
            <Sparkles className="size-3.5" />
            التقييمات
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-xl text-xs font-bold">
            <Images className="size-3.5" />
            الصور والشواهد
          </TabsTrigger>
          <TabsTrigger value="file" className="rounded-xl text-xs font-bold">
            <FileText className="size-3.5" />
            الملف الرسمي
          </TabsTrigger>
        </TabsList>

        {error ? (
          <EmptyState title="تعذّر تحميل سجل الطالب" description={(error as Error).message} />
        ) : null}

        <TabsContent value="academic" className="space-y-4">
          {isLoading || !data ? (
            <SkeletonRows rows={4} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="المرحلة" value={data.stageName ?? "—"} />
                <Stat label="الفصل" value={data.classroomName ?? "بدون فصل"} />
                <Stat
                  label="الرقم الأكاديمي"
                  value={file.application.studentNumber ?? file.application.applicationNumber ?? "—"}
                />
                <Stat label="العام الدراسي" value={file.application.academicYear} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="المعلمات" value={data.teacherNames.join(" · ") || "—"} />
                <Stat
                  label="الدروس المرصودة"
                  value={`${data.summary.evaluated} / ${data.summary.lessons}`}
                />
                <Stat label="مهارات أتقنها" value={String(data.summary.mastered)} />
                <Stat
                  label="نسبة الحضور (الشهر)"
                  value={rate === null ? "—" : `${rate}%`}
                  hint={yearRate === null ? undefined : `العام: ${yearRate}%`}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card p-4">
            <span className="text-xs font-bold text-muted-foreground">الشهر</span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="h-10 w-[170px] rounded-2xl text-xs font-bold"
            />
            {data
              ? ATTENDANCE_STATUSES.map((s) => (
                  <span
                    key={s}
                    className={cn(
                      "rounded-2xl border px-3 py-1.5 text-[11px] font-extrabold",
                      ATTENDANCE_STYLES[s],
                    )}
                  >
                    {ATTENDANCE_LABELS[s]}: {data.attendance.counts[s] ?? 0}
                  </span>
                ))
              : null}
          </div>

          {isLoading || !data ? (
            <SkeletonRows rows={5} />
          ) : data.attendance.records.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="لا يوجد تحضير في هذا الشهر"
              description="سجّل الحضور من تبويب الحضور والغياب ليظهر هنا."
            />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
              <table className="w-full text-start text-sm">
                <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">التاريخ</th>
                    <th className="px-4 py-3 text-start">الحالة</th>
                    <th className="px-4 py-3 text-start">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attendance.records.map((r) => (
                    <tr key={r.attendance_date} className="border-t border-border/50">
                      <td className="px-4 py-2.5 text-xs font-bold" dir="ltr">
                        {r.attendance_date}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-extrabold",
                            ATTENDANCE_STYLES[r.status as AttendanceStatus],
                          )}
                        >
                          {ATTENDANCE_LABELS[r.status as AttendanceStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assessments" className="space-y-4">
          {isLoading || !data ? (
            <SkeletonRows rows={5} />
          ) : data.subjects.length === 0 ? (
            <EmptyState
              title="لا توجد مناهج مرتبطة"
              description="اربط الطالب بفصل وأضف المواد والدروس في التتبع الأكاديمي."
            />
          ) : (
            <div className="space-y-4">
              {data.subjects.map((subject) => (
                <div key={subject.id} className="rounded-3xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: subject.colorHex }}
                    />
                    <h3 className="text-sm font-black text-foreground">{subject.nameAr}</h3>
                  </div>
                  <div className="mt-3 space-y-3">
                    {subject.topics.map((topic) => (
                      <div key={topic.id}>
                        <p className="text-xs font-extrabold text-muted-foreground">{topic.nameAr}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {topic.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between gap-2 rounded-2xl border border-border/50 bg-background p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-foreground">
                                  {lesson.nameAr}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {masteryLabel(lesson.cell?.performanceLevel ?? 0)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <EvaluationTriangle
                                  scale="performance"
                                  level={lesson.cell?.performanceLevel ?? 0}
                                  colors={lesson.cell?.performanceColors ?? []}
                                  size={38}
                                  readOnly
                                />
                                <EvaluationTriangle
                                  scale="growth"
                                  level={lesson.cell?.growthLevel ?? 0}
                                  colors={lesson.cell?.growthColors ?? []}
                                  size={38}
                                  readOnly
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          {isLoading || !data ? (
            <SkeletonRows rows={4} />
          ) : mediaItems.length === 0 ? (
            <EmptyState
              icon={<Images className="size-5" />}
              title="لا توجد شواهد مرفقة"
              description="ترفع المعلمة الصور والفيديوهات مع التقييمات فتظهر هنا."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(data.media ?? []).map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setViewer(mediaItems[index] ?? null)}
                  className="group overflow-hidden rounded-3xl border border-border/60 bg-card text-start"
                >
                  <div className="aspect-4/3 bg-muted/40">
                    {m.kind === "image" ? (
                      <img
                        src={m.url}
                        alt={m.name ?? m.context}
                        loading="lazy"
                        className="size-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">
                        {m.kind === "video" ? "فيديو" : m.kind === "pdf" ? "ملف PDF" : "مرفق"}
                      </div>
                    )}
                  </div>
                  <p className="truncate px-3 py-2 text-[11px] font-bold text-foreground">
                    {m.context}
                  </p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="file">{officialFile}</TabsContent>
      </Tabs>

      <MediaViewerDialog item={viewer} onClose={() => setViewer(null)} />
    </>
  );
}
