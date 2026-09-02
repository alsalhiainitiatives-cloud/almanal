/**
 * Daily attendance board: pick a classroom and a day, mark every child, then
 * review the monthly summary per student.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2, Save, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SkeletonRows } from "@/features/ams/components/atoms";
import {
  amsAttendanceBoard,
  amsAttendanceClassrooms,
  amsAttendanceSave,
} from "@/features/ams/attendance.functions";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  ATTENDANCE_STYLES,
  attendanceRate,
  type AttendanceStatus,
} from "@/features/ams/attendance";
import { cn } from "@/lib/utils";

function isoToday() {
  const now = new Date();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

function shiftDay(date: string, delta: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + delta);
  const m = `${next.getMonth() + 1}`.padStart(2, "0");
  const d = `${next.getDate()}`.padStart(2, "0");
  return `${next.getFullYear()}-${m}-${d}`;
}

export function AttendanceBoard() {
  const queryClient = useQueryClient();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [date, setDate] = useState(isoToday);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const month = date.slice(0, 7);

  const classrooms = useQuery({
    queryKey: ["ams", "attendance", "classrooms"],
    queryFn: () => amsAttendanceClassrooms(),
  });

  useEffect(() => {
    if (!classroomId && classrooms.data?.length) setClassroomId(classrooms.data[0].id);
  }, [classroomId, classrooms.data]);

  const board = useQuery({
    queryKey: ["ams", "attendance", classroomId, date],
    queryFn: () => amsAttendanceBoard({ data: { classroomId: classroomId!, date, month } }),
    enabled: Boolean(classroomId),
  });

  useEffect(() => {
    if (!board.data) return;
    setDraft(Object.fromEntries(board.data.students.map((s) => [s.childId, s.status])));
    setNotes(Object.fromEntries(board.data.students.map((s) => [s.childId, s.note ?? ""])));
  }, [board.data]);

  const save = useMutation({
    mutationFn: () =>
      amsAttendanceSave({
        data: {
          classroomId: classroomId!,
          date,
          entries: (board.data?.students ?? []).map((s) => ({
            childId: s.childId,
            status: draft[s.childId] ?? null,
            note: notes[s.childId] ?? null,
          })),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ams", "attendance"] });
      toast.success("تم حفظ الحضور لهذا اليوم.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = useMemo(() => {
    const counts = ATTENDANCE_STATUSES.reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<AttendanceStatus, number>,
    );
    for (const value of Object.values(draft)) if (value) counts[value] += 1;
    return counts;
  }, [draft]);

  const students = board.data?.students ?? [];
  const unmarked = students.filter((s) => !draft[s.childId]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border/60 bg-card p-4">
        <select
          value={classroomId ?? ""}
          onChange={(e) => setClassroomId(e.target.value || null)}
          className="h-11 min-w-[200px] rounded-2xl border border-border/60 bg-background px-3 text-xs font-bold"
        >
          <option value="">اختر الفصل</option>
          {(classrooms.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.stageName ? `${c.stageName} · ${c.name}` : c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setDate(shiftDay(date, -1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || isoToday())}
            className="h-11 w-[170px] rounded-2xl text-xs font-bold"
          />
          <Button variant="outline" size="icon" className="rounded-2xl" onClick={() => setDate(shiftDay(date, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" className="rounded-2xl text-xs font-bold" onClick={() => setDate(isoToday())}>
            اليوم
          </Button>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-2xl text-xs font-bold"
            disabled={!students.length}
            onClick={() =>
              setDraft(Object.fromEntries(students.map((s) => [s.childId, "present" as AttendanceStatus])))
            }
          >
            <Users className="size-4" />
            تحضير الجميع
          </Button>
          <Button
            className="rounded-2xl text-xs font-black"
            disabled={!students.length || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ الحضور
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ATTENDANCE_STATUSES.map((status) => (
          <div key={status} className="rounded-3xl border border-border/60 bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground">{ATTENDANCE_LABELS[status]}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{totals[status]}</p>
          </div>
        ))}
        <div className="rounded-3xl border border-border/60 bg-card p-4">
          <p className="text-[11px] font-bold text-muted-foreground">لم يُسجّل بعد</p>
          <p className="mt-1 text-2xl font-black text-foreground">{unmarked}</p>
        </div>
      </div>

      {!classroomId ? (
        <EmptyState
          icon={<CalendarCheck className="size-5" />}
          title="اختر فصلًا للبدء"
          description="سجّل الحضور اليومي لكل فصل، وستظهر النتيجة في تقويم الفصل تلقائيًا."
        />
      ) : board.isLoading ? (
        <SkeletonRows rows={6} />
      ) : board.error ? (
        <EmptyState title="تعذّر التحميل" description={(board.error as Error).message} />
      ) : students.length === 0 ? (
        <EmptyState title="لا يوجد طلاب في هذا الفصل" description="أضف الطلاب للفصل من «الفصول والمقاعد»." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <table className="w-full min-w-[860px] text-start text-sm">
            <thead className="bg-muted/40 text-[11px] font-black text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">الطالب</th>
                <th className="px-4 py-3 text-start">حالة اليوم</th>
                <th className="px-4 py-3 text-start">ملاحظة</th>
                <th className="px-4 py-3 text-start">نسبة الحضور الشهرية</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const rate = attendanceRate(s.monthCounts);
                return (
                  <tr key={s.childId} className="border-t border-border/50">
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground" dir="ltr">
                        {s.academicNumber ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ATTENDANCE_STATUSES.map((status) => {
                          const active = draft[s.childId] === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  [s.childId]: prev[s.childId] === status ? null : status,
                                }))
                              }
                              className={cn(
                                "rounded-full border px-3 py-1 text-[11px] font-black transition",
                                active
                                  ? ATTENDANCE_STYLES[status]
                                  : "border-border/60 bg-background text-muted-foreground hover:border-primary/40",
                              )}
                            >
                              {ATTENDANCE_LABELS[status]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={notes[s.childId] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [s.childId]: e.target.value }))}
                        placeholder="سبب الغياب أو التأخر…"
                        className="h-9 rounded-xl text-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">
                      {rate === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-[11px] font-black",
                            rate >= 90
                              ? ATTENDANCE_STYLES.present
                              : rate >= 75
                                ? ATTENDANCE_STYLES.late
                                : ATTENDANCE_STYLES.absent,
                          )}
                        >
                          {rate}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
