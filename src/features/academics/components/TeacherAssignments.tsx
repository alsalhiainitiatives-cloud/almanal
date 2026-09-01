import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
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
import { Label } from "@/components/ui/label";
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
} from "../academics.functions";

export function TeacherAssignments() {
  const queryClient = useQueryClient();
  const [teacherSearch, setTeacherSearch] = useState("");
  const [activeClassroom, setActiveClassroom] = useState<string>("");

  const boardQuery = useQuery({
    queryKey: ["academics", "assignments"],
    queryFn: () => academicsAssignmentBoard(),
  });

  const teachers = boardQuery.data?.teachers ?? [];
  const classrooms = boardQuery.data?.classrooms ?? [];
  const selectedClassroom = classrooms.find((room) => room.id === activeClassroom) ?? classrooms[0];

  const teacherName = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.fullName])),
    [teachers],
  );

  const filteredTeachers = useMemo(() => {
    const term = teacherSearch.trim();
    if (!term) return teachers;
    return teachers.filter(
      (t) => t.fullName.includes(term) || (t.email ?? "").includes(term) || (t.phone ?? "").includes(term),
    );
  }, [teacherSearch, teachers]);

  const saveMutation = useMutation({
    mutationFn: (input: { classroomId: string; teacherIds: string[] }) =>
      academicsSetClassroomTeachers({ data: input }),
    onSuccess: () => {
      toast.success("تم تحديث الإسناد");
      void queryClient.invalidateQueries({ queryKey: ["academics", "assignments"] });
      void queryClient.invalidateQueries({ queryKey: ["academics", "classrooms"] });
    },
    onError: (error: Error) =>
      toast.error(error.message === "forbidden" ? "هذا الإجراء متاح للمدير العام فقط" : error.message),
  });

  function toggle(teacherId: string) {
    if (!selectedClassroom) return;
    const current = selectedClassroom.teacherIds;
    const next = current.includes(teacherId)
      ? current.filter((id) => id !== teacherId)
      : [...current, teacherId];
    saveMutation.mutate({ classroomId: selectedClassroom.id, teacherIds: next });
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
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Teachers */}
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
          <header className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
              <UsersRound className="size-4 text-primary" />
              المعلمات ({teachers.length})
            </h3>
          </header>

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
              const assigned = selectedClassroom?.teacherIds.includes(teacher.id) ?? false;
              return (
                <button
                  key={teacher.id}
                  type="button"
                  disabled={!selectedClassroom || saveMutation.isPending}
                  onClick={() => toggle(teacher.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition",
                    assigned
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-background/60 hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-2xl text-xs font-black",
                      assigned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {assigned ? <Check className="size-4" /> : teacher.fullName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-foreground">
                      {teacher.fullName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {teacher.classroomIds.length
                        ? `مُسندة إلى ${teacher.classroomIds.length} فصل`
                        : "غير مُسندة لأي فصل"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="hidden place-items-center lg:grid">
          <span className="grid size-11 place-items-center rounded-2xl border border-border/60 bg-background/70 text-muted-foreground">
            <ArrowLeftRight className="size-4" />
          </span>
        </div>

        {/* Classrooms */}
        <section className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <GraduationCap className="size-4 text-primary" />
            الفصول النشطة ({classrooms.length})
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            اختر فصلًا ثم اضغط أسماء المعلمات على اليمين لإسنادهن أو فك الإسناد.
          </p>

          <div className="mt-3 space-y-2">
            {classrooms.map((room) => {
              const active = selectedClassroom?.id === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveClassroom(room.id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-start transition",
                    active
                      ? "border-primary/60 bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background/60 hover:border-primary/40",
                  )}
                >
                  <span className="flex items-center gap-2.5">
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
                        {room.teacherIds.length} معلمة · {room.enrolledCount} طفل
                      </span>
                    </span>
                  </span>

                  {room.teacherIds.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {room.teacherIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary"
                        >
                          {teacherName.get(id) ?? "معلمة"}
                          {active && (
                            <X
                              className="size-3 cursor-pointer"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggle(id);
                              }}
                            />
                          )}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Summary */}
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
          <div>
            <h3 className="text-sm font-black text-foreground">ملخص الإسناد</h3>
            <p className="text-[11px] text-muted-foreground">
              الفصل · المعلمات المسندة · عدد الأطفال المسجلين
            </p>
          </div>
          {saveMutation.isPending && <Loader2 className="size-4 animate-spin text-primary" />}
        </header>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start text-[11px] font-black">الفصل</TableHead>
                <TableHead className="text-start text-[11px] font-black">المرحلة</TableHead>
                <TableHead className="text-start text-[11px] font-black">المعلمات المسندة</TableHead>
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
