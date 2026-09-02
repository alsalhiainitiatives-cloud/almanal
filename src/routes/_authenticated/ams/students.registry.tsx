import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, GraduationCap, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { amsStudents } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import { formatApplicationCode } from "@/features/admissions/application-code";
import { isValidAcademicNumber } from "@/features/ams/academic-number";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ams/students/")({
  head: () => ({
    meta: [
      { title: "شؤون الطلاب — مدارس وروضة المنال" },
      { name: "description", content: "سجل الطلاب المقبولين وملفاتهم الرسمية القابلة للطباعة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const [stageId, setStageId] = useState<string | null>(null);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "students", stageId, classroomId],
    queryFn: () => amsStudents({ data: { stageId, classroomId } }),
  });

  const stages = data?.stages ?? [];
  const classrooms = useMemo(
    () => (data?.classrooms ?? []).filter((c) => !stageId || c.stage_id === stageId),
    [data?.classrooms, stageId],
  );
  const classroomName = (id: string | null) =>
    (data?.classrooms ?? []).find((c) => c.id === id)?.name_ar ?? "بدون فصل";
  const stageName = (id: string | null) => stages.find((s) => s.id === id)?.name_ar ?? "—";

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data?.students ?? [];
    if (!needle) return list;
    return list.filter((s) =>
      [s.name_ar, s.national_id, s.applicationNumber, s.parentName, s.parentPhone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data?.students, q]);

  return (
    <AmsShell
      title="شؤون الطلاب"
      description="سجل الطلاب المقبولين — يحوّل بيانات التسجيل إلى ملف طالب رسمي قابل للطباعة والتقديم عند النقل"
      wide
    >
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم الطالب أو الهوية أو الرقم الأكاديمي أو ولي الأمر…"
                className="h-11 rounded-2xl ps-9 text-sm"
              />
            </div>
            <select
              value={stageId ?? ""}
              onChange={(e) => {
                setStageId(e.target.value || null);
                setClassroomId(null);
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
              value={classroomId ?? ""}
              onChange={(e) => setClassroomId(e.target.value || null)}
              className="h-11 rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
            >
              <option value="">كل الفصول</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
            <span className="rounded-2xl bg-muted px-3 py-2 text-xs font-extrabold text-foreground">
              {rows.length} طالب/طالبة
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="size-5" />}
              title="لا يوجد طلاب مطابقون"
              description="سجل الطلاب يعرض الطلبات المعتمدة فقط. اعتمد الطلبات من قائمة الطلبات لتظهر هنا."
            />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
              <table className="w-full min-w-[880px] text-start text-sm">
                <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">الطالب</th>
                    <th className="px-4 py-3 text-start">الهوية</th>
                    <th className="px-4 py-3 text-start">العمر</th>
                    <th className="px-4 py-3 text-start">المرحلة / الفصل</th>
                    <th className="px-4 py-3 text-start">ولي الأمر</th>
                    <th className="px-4 py-3 text-start">موسم التسجيل</th>
                    <th className="px-4 py-3 text-start">الرقم الأكاديمي</th>
                    <th className="px-4 py-3 text-start">الملف</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-t border-border/50 hover:bg-muted/25">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-foreground">{s.name_ar}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.gender === "female" ? "أنثى" : s.gender === "male" ? "ذكر" : "—"} ·{" "}
                          {s.nationality ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" dir="ltr">
                        {s.national_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.birth_date ? formatAge(ageInMonths(s.birth_date)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-bold text-foreground">{stageName(s.stage_id)}</span>
                        <span className="text-muted-foreground"> · {classroomName(s.classroom_id)}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-bold text-foreground">{s.parentName}</p>
                        <p className="text-muted-foreground" dir="ltr">
                          {s.parentPhone ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-bold text-foreground">{s.academicYear}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.seasonKind === "supplementary" ? "تسجيل إلحاقي" : "تسجيل نظامي"}
                          {s.registeredAt
                            ? ` · ${new Date(s.registeredAt).toLocaleDateString("ar-SA-u-ca-gregory")}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs font-extrabold" dir="ltr">
                        {isValidAcademicNumber(s.studentNumber)
                          ? (s.studentNumber ?? "").trim().toUpperCase()
                          : formatApplicationCode(s.applicationNumber)}
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="outline" className={cn("rounded-xl text-xs font-bold")}>
                          <Link to="/ams/students/$childId" params={{ childId: s.id }}>
                            <FileText className="size-3.5" />
                            ملف الطالب
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AmsShell>
  );
}