import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  GraduationCap,
  Loader2,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  academicsAssignmentBoard,
  academicsSetClassroomTeachers,
  academicsSetSubjectTeachers,
} from "../academics.functions";

export function TeacherAssignments() {
  const queryClient = useQueryClient();
  const [teacherSearch, setTeacherSearch] = useState("");
  const [activeTeacher, setActiveTeacher] = useState<string>("");
  const [activeClassroom, setActiveClassroom] = useState<string>("");

  const boardQuery = useQuery({
    queryKey: ["academics", "assignments"],
    queryFn: () => academicsAssignmentBoard(),
  });

  const teachers = boardQuery.data?.teachers ?? [];
  const classrooms = boardQuery.data?.classrooms ?? [];

  const selectedTeacher = teachers.find((t) => t.id === activeTeacher) ?? null;
  const selectedClassroom = classrooms.find((room) => room.id === activeClassroom) ?? null;
  const classroomSubjects = selectedClassroom?.subjects ?? [];

  const teacherName = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.fullName])),
    [teachers],
  );

  const filteredTeachers = useMemo(() => {
    const term = teacherSearch.trim();
    if (!term) return teachers;
    return teachers.filter(
      (t) =>
        t.fullName.includes(term) ||
        (t.email ?? "").includes(term) ||
        (t.phone ?? "").includes(term),
    );
  }, [teacherSearch, teachers]);

  const classroomMutation = useMutation({
    mutationFn: (input: { classroomId: string; teacherIds: string[] }) =>
      academicsSetClassroomTeachers({ data: input }),
    onSuccess: () => {
      toast.success("تم تحديث إسناد الفصل");
      void queryClient.invalidateQueries({ queryKey: ["academics", "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["academics", "classrooms"] });
    },
    onError: (error: Error) =>
      toast.error(error.message === "forbidden" ? "هذا الإجراء متاح للمدير العام فقط" : error.message),
  });

  const subjectMutation = useMutation({
    mutationFn: (input: { subjectId: string; teacherIds: string[] }) =>
      academicsSetSubjectTeachers({ data: input }),
    onSuccess: () => {
      toast.success("تم تحديث إسناد المادة");
      void queryClient.invalidateQueries({ queryKey: ["academics", "assignments"] });
    },
    onError: (error: Error) =>
      toast.error(error.message === "forbidden" ? "هذا الإجراء متاح للمدير العام فقط" : error.message),
  });

  const busy = classroomMutation.isPending || subjectMutation.isPending;

  function toggleClassroom(classroomId: string, teacherId?: string) {
    const target = teacherId ?? activeTeacher;
    if (!target) {
      toast.error("اختاري المعلمة أولًا من العمود الأول.");
      return;
    }
    const room = classrooms.find((r) => r.id === classroomId);
    if (!room) return;
    const next = room.teacherIds.includes(target)
      ? room.teacherIds.filter((id) => id !== target)
      : [...room.teacherIds, target];
    classroomMutation.mutate({ classroomId, teacherIds: next });
  }

  function toggleSubject(subjectId: string, teacherId?: string) {
    const target = teacherId ?? activeTeacher;
    if (!target) {
      toast.error("اختاري المعلمة أولًا من العمود الأول.");
      return;
    }
    const subject = classroomSubjects.find((s) => s.id === subjectId);
    if (!subject) return;
    const next = subject.teacherIds.includes(target)
      ? subject.teacherIds.filter((id) => id !== target)
      : [...subject.teacherIds, target];
    subjectMutation.mutate({ subjectId, teacherIds: next });
  }

  if (boardQuery.isLoading) {
    return (
      <div className="grid place-items-center rounded-[2rem] border border-border/60 bg-card p-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">تعذّر تحميل لوحة الإسناد.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          هذه اللوحة متاحة للمدير العام / المديرة / المشرفة فقط.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Steps hint */}
      <section className="rounded-[2rem] border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
          {[
            { n: 1, label: "اختاري المعلمة", done: Boolean(selectedTeacher) },
            { n: 2, label: "اختاري الفصل", done: Boolean(selectedClassroom) },
            { n: 3, label: "اختاري المادة", done: false },
          ].map((step) => (
            <span
              key={step.n}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5",
                step.done
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-background/60 text-muted-foreground",
              )}
            >
              <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] text-primary">
                {step.n}
              </span>
              {step.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {selectedTeacher
            ? `المعلمة المحددة: ${selectedTeacher.fullName} — اضغطي الفصل لإسنادها كمعلمة فصل، أو اختاري الفصل ثم المادة لإسنادها كمعلمة مادة.`
            : "ابدئي باختيار المعلمة من العمود الأول."}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 1 — Teachers */}
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <UsersRound className="size-4 text-primary" />
            المعلمات ({teachers.length})
          </h3>

          <div className="relative mt-3">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="ابحث باسم المعلمة أو البريد"
              className="rounded-2xl pe-9 font-bold"
            />
          </div>

          <div className="mt-3 space-y-2">
            {filteredTeachers.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-xs font-bold text-muted-foreground">
                لا توجد معلمات مطابقة. يتم منح صلاحية «معلمة» من إدارة المستخدمين.
              </p>
            )}
            {filteredTeachers.map((teacher) => {
              const active = teacher.id === activeTeacher;
              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => setActiveTeacher(active ? "" : teacher.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition",
                    active
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background/60 hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-2xl text-xs font-black",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {active ? <Check className="size-4" /> : teacher.fullName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-foreground">
                      {teacher.fullName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {teacher.classroomIds.length
                        ? `${teacher.classroomIds.length} فصل`
                        : "غير مُسندة لأي فصل"}
                      {teacher.subjectIds.length > 0 && ` · ${teacher.subjectIds.length} مادة`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2 — Classrooms */}
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <GraduationCap className="size-4 text-primary" />
            الفصول النشطة ({classrooms.length})
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            اضغطي الفصل لعرض مواده، وزر «معلمة فصل» لإسناد المعلمة المحددة للفصل كامل.
          </p>

          <div className="mt-3 space-y-2">
            {classrooms.map((room) => {
              const active = selectedClassroom?.id === room.id;
              const assigned = activeTeacher ? room.teacherIds.includes(activeTeacher) : false;
              return (
                <div
                  key={room.id}
                  className={cn(
                    "rounded-2xl border p-3 transition",
                    active
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveClassroom(room.id)}
                    className="flex w-full items-center gap-2.5 text-start"
                  >
                    <span
                      className="size-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: room.colorHex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-foreground">
                        {room.nameAr}
                        <span className="ms-2 text-[10px] font-bold text-muted-foreground">
                          {room.stageNameAr}
                        </span>
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {room.teacherIds.length} معلمة فصل · {room.subjects.length} مادة ·{" "}
                        {room.enrolledCount} طفل
                      </span>
                    </span>
                  </button>

                  {room.teacherIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {room.teacherIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary"
                        >
                          {teacherName.get(id) ?? "معلمة"}
                          <X
                            className="size-3 cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleClassroom(room.id, id);
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant={assigned ? "default" : "outline"}
                    disabled={!activeTeacher || busy}
                    onClick={() => toggleClassroom(room.id)}
                    className="mt-2 w-full rounded-2xl text-[11px] font-black"
                  >
                    {assigned ? "إلغاء إسنادها كمعلمة فصل" : "إسناد المعلمة كمعلمة فصل"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3 — Subjects */}
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <BookOpen className="size-4 text-primary" />
            المواد {selectedClassroom ? `— ${selectedClassroom.nameAr}` : ""} (
            {classroomSubjects.length})
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            إسناد المعلمة لمادة محددة داخل هذا الفصل، دون أن تكون معلمة الفصل.
          </p>

          {!selectedClassroom ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-[11px] font-bold text-muted-foreground">
              اختاري فصلًا من العمود الأوسط لعرض مواده.
            </p>
          ) : classroomSubjects.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-[11px] font-bold text-muted-foreground">
              لا توجد مواد لهذا الفصل بعد. تُضاف المواد من تبويب «المنهج».
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {classroomSubjects.map((subject) => {
                const assigned = activeTeacher ? subject.teacherIds.includes(activeTeacher) : false;
                return (
                  <div
                    key={subject.id}
                    className={cn(
                      "rounded-2xl border p-3 transition",
                      assigned
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/60 bg-background/60",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject.colorHex }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-foreground">
                          {subject.nameAr}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {subject.teacherIds.length
                            ? `${subject.teacherIds.length} معلمة مادة`
                            : "لا توجد معلمة مادة"}
                        </span>
                      </span>
                    </div>

                    {subject.teacherIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subject.teacherIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary"
                          >
                            {teacherName.get(id) ?? "معلمة"}
                            <X
                              className="size-3 cursor-pointer"
                              onClick={() => toggleSubject(subject.id, id)}
                            />
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant={assigned ? "default" : "outline"}
                      disabled={!activeTeacher || busy}
                      onClick={() => toggleSubject(subject.id)}
                      className="mt-2 w-full rounded-2xl text-[11px] font-black"
                    >
                      {assigned ? "إلغاء إسناد المادة" : "إسناد المعلمة لهذه المادة"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Summary */}
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
          <div>
            <h3 className="text-sm font-black text-foreground">ملخص الإسناد</h3>
            <p className="text-[11px] text-muted-foreground">
              الفصل · معلمات الفصل · معلمات المواد · عدد الأطفال المسجلين
            </p>
          </div>
          {busy && <Loader2 className="size-4 animate-spin text-primary" />}
        </header>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start text-[11px] font-black">الفصل</TableHead>
                <TableHead className="text-start text-[11px] font-black">المرحلة</TableHead>
                <TableHead className="text-start text-[11px] font-black">معلمات الفصل</TableHead>
                <TableHead className="text-start text-[11px] font-black">معلمات المواد</TableHead>
                <TableHead className="text-start text-[11px] font-black">الأطفال</TableHead>
                <TableHead className="text-start text-[11px] font-black">السعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classrooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="text-xs font-black">{room.nameAr}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{room.stageNameAr}</TableCell>
                  <TableCell className="text-xs font-bold">
                    {room.teacherIds.length
                      ? room.teacherIds.map((id) => teacherName.get(id) ?? "معلمة").join(" · ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-bold">
                    {room.subjects.some((s) => s.teacherIds.length)
                      ? room.subjects
                          .filter((s) => s.teacherIds.length)
                          .map(
                            (s) =>
                              `${s.nameAr}: ${s.teacherIds
                                .map((id) => teacherName.get(id) ?? "معلمة")
                                .join(" و")}`,
                          )
                          .join(" · ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs font-black">{room.enrolledCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{room.capacity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
