import { useMutation } from "@tanstack/react-query";
import { ArrowLeftRight, BookOpen, Check, CopyCheck, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ClassroomOption, SubjectNode } from "../academics";
import { academicsCopyCurriculum } from "../academics.functions";

export function CopyCurriculumDialog({
  open,
  onOpenChange,
  source,
  classrooms,
  subjects,
  onDone,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  source: ClassroomOption | null;
  classrooms: ClassroomOption[];
  subjects: SubjectNode[];
  onDone: () => void;
}) {
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"merge" | "duplicate">("merge");

  const targets = useMemo(
    () => classrooms.filter((room) => room.id !== source?.id),
    [classrooms, source?.id],
  );

  const groupedTargets = useMemo(() => {
    const map = new Map<string, { stageNameAr: string; rooms: ClassroomOption[] }>();
    for (const room of targets) {
      const entry = map.get(room.stageId) ?? { stageNameAr: room.stageNameAr, rooms: [] };
      entry.rooms.push(room);
      map.set(room.stageId, entry);
    }
    return [...map.values()];
  }, [targets]);

  const selectedSubjects = subjectIds.length ? subjectIds : subjects.map((s) => s.id);

  const totals = useMemo(() => {
    const picked = subjects.filter((s) => selectedSubjects.includes(s.id));
    const topics = picked.reduce((n, s) => n + s.topics.length, 0);
    const lessons = picked.reduce(
      (n, s) => n + s.topics.reduce((m, t) => m + t.lessons.length, 0),
      0,
    );
    return { subjects: picked.length, topics, lessons };
  }, [selectedSubjects, subjects]);

  const copyMutation = useMutation({
    mutationFn: () =>
      academicsCopyCurriculum({
        data: {
          sourceClassroomId: source!.id,
          targetClassroomIds: targetIds,
          subjectIds: selectedSubjects,
          mode,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `تم النسخ إلى ${result.classrooms} فصل · ${result.subjects} مادة جديدة، ${result.topics} محور، ${result.lessons} درس` +
          (result.skipped ? ` (${result.skipped} مادة مطابقة تم دمجها)` : ""),
      );
      setSubjectIds([]);
      setTargetIds([]);
      onOpenChange(false);
      onDone();
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر نسخ المنهج"),
  });

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black">
            <ArrowLeftRight className="size-4 text-primary" />
            نسخ المنهج بين الفصول
          </DialogTitle>
          <DialogDescription className="text-xs">
            انسخ المواد والمحاور والدروس من «{source?.nameAr ?? "—"}» إلى فصول أخرى تدرّس المواد
            نفسها، دون إعادة تعريفها يدويًا.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Subjects */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black">المواد المصدر</Label>
              <button
                type="button"
                className="text-[11px] font-bold text-primary"
                onClick={() =>
                  setSubjectIds(
                    subjectIds.length === subjects.length ? [] : subjects.map((s) => s.id),
                  )
                }
              >
                {subjectIds.length === subjects.length ? "إلغاء التحديد" : "تحديد الكل"}
              </button>
            </div>
            <ScrollArea className="h-64 rounded-2xl border border-border/60 p-2">
              <div className="space-y-1.5">
                {subjects.length === 0 && (
                  <p className="p-4 text-center text-xs font-bold text-muted-foreground">
                    لا توجد مواد في الفصل المصدر.
                  </p>
                )}
                {subjects.map((subject) => {
                  const checked = subjectIds.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => setSubjectIds((prev) => toggle(prev, subject.id))}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition",
                        checked ? "border-primary bg-primary/5" : "border-border/60 bg-background/60",
                      )}
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: subject.colorHex }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black text-foreground">
                          {subject.nameAr}
                        </span>
                        <span className="block text-[10px] font-bold text-muted-foreground">
                          {subject.topics.length} محور ·{" "}
                          {subject.topics.reduce((n, t) => n + t.lessons.length, 0)} درس
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <p className="text-[11px] font-bold text-muted-foreground">
              بدون تحديد يتم نسخ جميع المواد.
            </p>
          </section>

          {/* Targets */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black">الفصول المستهدفة</Label>
              <button
                type="button"
                className="text-[11px] font-bold text-primary"
                onClick={() =>
                  setTargetIds(targetIds.length === targets.length ? [] : targets.map((r) => r.id))
                }
              >
                {targetIds.length === targets.length ? "إلغاء التحديد" : "تحديد الكل"}
              </button>
            </div>
            <ScrollArea className="h-64 rounded-2xl border border-border/60 p-2">
              <div className="space-y-3">
                {groupedTargets.map((group) => (
                  <div key={group.stageNameAr} className="space-y-1.5">
                    <p className="px-1 text-[10px] font-black text-muted-foreground">
                      {group.stageNameAr}
                    </p>
                    {group.rooms.map((room) => {
                      const checked = targetIds.includes(room.id);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setTargetIds((prev) => toggle(prev, room.id))}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition",
                            checked
                              ? "border-primary bg-primary/5"
                              : "border-border/60 bg-background/60",
                          )}
                        >
                          <Checkbox checked={checked} className="pointer-events-none" />
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: room.colorHex }}
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-black text-foreground">
                            {room.nameAr}
                          </span>
                          {checked && <Check className="size-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {targets.length === 0 && (
                  <p className="p-4 text-center text-xs font-bold text-muted-foreground">
                    لا توجد فصول أخرى متاحة.
                  </p>
                )}
              </div>
            </ScrollArea>
          </section>
        </div>

        <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
          <Label className="text-xs font-black">أسلوب النسخ</Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as "merge" | "duplicate")}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 p-3">
              <RadioGroupItem value="merge" className="mt-0.5" />
              <span>
                <span className="block text-xs font-black text-foreground">دمج ذكي (موصى به)</span>
                <span className="block text-[11px] text-muted-foreground">
                  يتم تجاهل المواد والمحاور والدروس المتطابقة بالاسم ونسخ الجديد فقط.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 p-3">
              <RadioGroupItem value="duplicate" className="mt-0.5" />
              <span>
                <span className="block text-xs font-black text-foreground">نسخة مستقلة</span>
                <span className="block text-[11px] text-muted-foreground">
                  إنشاء نسخة كاملة جديدة حتى لو وُجدت مواد بالاسم نفسه.
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-muted-foreground">
          <BookOpen className="size-3.5 text-primary" />
          سيتم نسخ {totals.subjects} مادة · {totals.topics} محور · {totals.lessons} درس إلى{" "}
          {targetIds.length} فصل
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            className="rounded-2xl font-bold"
            disabled={!source || !targetIds.length || !subjects.length || copyMutation.isPending}
            onClick={() => copyMutation.mutate()}
          >
            {copyMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CopyCheck className="size-4" />
            )}
            تنفيذ النسخ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
