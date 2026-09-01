import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import { cn } from "@/lib/utils";
import {
  SUBJECT_COLORS,
  canEditCurriculum,
  type SubjectNode,
  type TopicNode,
} from "../academics";
import {
  academicsClassrooms,
  academicsCurriculum,
  academicsDeleteNode,
  academicsSaveLesson,
  academicsSaveSubject,
  academicsSaveTopic,
} from "../academics.functions";

type DraftKind = "subject" | "topic" | "lesson";

type Draft = {
  kind: DraftKind;
  id?: string | null;
  parentId: string;
  nameAr: string;
  descriptionAr: string;
  colorHex: string;
  isActive: boolean;
};

const KIND_LABELS: Record<DraftKind, { one: string; add: string }> = {
  subject: { one: "المادة", add: "إضافة مادة" },
  topic: { one: "المحور", add: "إضافة محور" },
  lesson: { one: "الدرس", add: "إضافة درس" },
};

export function CurriculumManager() {
  const { roles } = useAuth();
  const canEdit = canEditCurriculum(roles);
  const queryClient = useQueryClient();
  const [stageId, setStageId] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    kind: DraftKind;
    id: string;
    name: string;
  } | null>(null);

  const classroomsQuery = useQuery({
    queryKey: ["academics", "classrooms"],
    queryFn: () => academicsClassrooms(),
  });
  const classrooms = classroomsQuery.data?.classrooms ?? [];

  const stages = useMemo(() => {
    const map = new Map<string, string>();
    for (const room of classrooms) map.set(room.stageId, room.stageNameAr);
    return [...map.entries()].map(([id, nameAr]) => ({ id, nameAr }));
  }, [classrooms]);

  const stageClassrooms = useMemo(
    () => (stageId ? classrooms.filter((room) => room.stageId === stageId) : classrooms),
    [classrooms, stageId],
  );

  useEffect(() => {
    if (!stageId && stages.length) setStageId(stages[0]!.id);
  }, [stageId, stages]);

  useEffect(() => {
    if (!stageClassrooms.length) return;
    if (!stageClassrooms.some((room) => room.id === classroomId)) {
      setClassroomId(stageClassrooms[0]!.id);
    }
  }, [classroomId, stageClassrooms]);


  const treeQuery = useQuery({
    queryKey: ["academics", "curriculum", classroomId],
    queryFn: () => academicsCurriculum({ data: { classroomId } }),
    enabled: Boolean(classroomId),
  });
  const subjects = treeQuery.data ?? [];

  const counts = useMemo(() => {
    const topics = subjects.reduce((sum, s) => sum + s.topics.length, 0);
    const lessons = subjects.reduce(
      (sum, s) => sum + s.topics.reduce((n, t) => n + t.lessons.length, 0),
      0,
    );
    return { subjects: subjects.length, topics, lessons };
  }, [subjects]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["academics", "curriculum", classroomId] });
  }

  const saveMutation = useMutation({
    mutationFn: async (value: Draft) => {
      const name = value.nameAr.trim();
      if (value.kind === "subject") {
        return academicsSaveSubject({
          data: {
            id: value.id ?? null,
            classroomId: value.parentId,
            nameAr: name,
            colorHex: value.colorHex,
            isActive: value.isActive,
          },
        });
      }
      if (value.kind === "topic") {
        return academicsSaveTopic({
          data: {
            id: value.id ?? null,
            subjectId: value.parentId,
            nameAr: name,
            isActive: value.isActive,
          },
        });
      }
      return academicsSaveLesson({
        data: {
          id: value.id ?? null,
          topicId: value.parentId,
          nameAr: name,
          descriptionAr: value.descriptionAr.trim() || null,
          isActive: value.isActive,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم الحفظ بنجاح");
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (value: { kind: DraftKind; id: string }) => academicsDeleteNode({ data: value }),
    onSuccess: () => {
      toast.success("تم الحذف");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "تعذّر الحذف"),
  });

  function newDraft(kind: DraftKind, parentId: string): Draft {
    return {
      kind,
      parentId,
      nameAr: "",
      descriptionAr: "",
      colorHex: SUBJECT_COLORS[counts.subjects % SUBJECT_COLORS.length]!,
      isActive: true,
    };
  }

  function confirmDelete(kind: DraftKind, id: string, name: string) {
    if (!window.confirm(`سيتم حذف «${name}» وكل ما يتبعه. هل تريد المتابعة؟`)) return;
    deleteMutation.mutate({ kind, id });
  }

  if (classroomsQuery.isLoading) {
    return (
      <div className="grid place-items-center rounded-[2rem] border border-border/60 bg-card p-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!classrooms.length) {
    return (
      <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">لا توجد فصول متاحة لك حاليًا.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          يتم إسناد الفصول من «إسناد المعلمات» أو من شؤون الطلاب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="min-w-[240px] space-y-1.5">
          <Label className="text-[11px] font-black text-muted-foreground">الفصل الدراسي</Label>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger className="rounded-2xl font-bold">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: room.colorHex }}
                    />
                    {room.nameAr}
                    <span className="text-[10px] text-muted-foreground">{room.stageNameAr}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Stat icon={BookOpen} label="مواد" value={counts.subjects} />
          <Stat icon={Layers} label="محاور" value={counts.topics} />
          <Stat icon={Sparkles} label="دروس" value={counts.lessons} />
          {canEdit && (
            <Button
              className="rounded-2xl font-bold"
              onClick={() => setDraft(newDraft("subject", classroomId))}
            >
              <Plus className="size-4" />
              إضافة مادة
            </Button>
          )}
        </div>
      </div>

      {/* Tree */}
      {treeQuery.isLoading ? (
        <div className="grid place-items-center rounded-[2rem] border border-border/60 bg-card p-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card p-12 text-center">
          <p className="text-sm font-black text-foreground">لا توجد مواد لهذا الفصل بعد.</p>
          {canEdit && (
            <Button
              variant="outline"
              className="mt-4 rounded-2xl font-bold"
              onClick={() => setDraft(newDraft("subject", classroomId))}
            >
              <Plus className="size-4" />
              ابدأ بإضافة مادة
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              canEdit={canEdit}
              open={open}
              toggle={(key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
              onAddTopic={() => setDraft(newDraft("topic", subject.id))}
              onEditSubject={() =>
                setDraft({
                  kind: "subject",
                  id: subject.id,
                  parentId: subject.classroomId,
                  nameAr: subject.nameAr,
                  descriptionAr: "",
                  colorHex: subject.colorHex,
                  isActive: subject.isActive,
                })
              }
              onDeleteSubject={() => confirmDelete("subject", subject.id, subject.nameAr)}
              onAddLesson={(topic) => setDraft(newDraft("lesson", topic.id))}
              onEditTopic={(topic) =>
                setDraft({
                  kind: "topic",
                  id: topic.id,
                  parentId: subject.id,
                  nameAr: topic.nameAr,
                  descriptionAr: "",
                  colorHex: subject.colorHex,
                  isActive: topic.isActive,
                })
              }
              onDeleteTopic={(topic) => confirmDelete("topic", topic.id, topic.nameAr)}
              onEditLesson={(topic, lesson) =>
                setDraft({
                  kind: "lesson",
                  id: lesson.id,
                  parentId: topic.id,
                  nameAr: lesson.nameAr,
                  descriptionAr: lesson.descriptionAr ?? "",
                  colorHex: subject.colorHex,
                  isActive: lesson.isActive,
                })
              }
              onDeleteLesson={(lesson) => confirmDelete("lesson", lesson.id, lesson.nameAr)}
            />
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={Boolean(draft)} onOpenChange={(value) => !value && setDraft(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle className="font-black">
                  {draft.id ? `تعديل ${KIND_LABELS[draft.kind].one}` : KIND_LABELS[draft.kind].add}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  المنهج مرتّب هرميًا: مادة ← محور ← درس.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black">اسم {KIND_LABELS[draft.kind].one}</Label>
                  <Input
                    value={draft.nameAr}
                    autoFocus
                    onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                    placeholder={
                      draft.kind === "subject"
                        ? "مثال: التربية الإسلامية"
                        : draft.kind === "topic"
                          ? "مثال: القرآن الكريم"
                          : "مثال: سورة الفاتحة"
                    }
                    className="rounded-2xl font-bold"
                  />
                </div>

                {draft.kind === "lesson" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black">وصف مختصر (اختياري)</Label>
                    <Textarea
                      value={draft.descriptionAr}
                      onChange={(e) => setDraft({ ...draft, descriptionAr: e.target.value })}
                      rows={3}
                      className="rounded-2xl"
                    />
                  </div>
                )}

                {draft.kind === "subject" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black">لون المادة</Label>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setDraft({ ...draft, colorHex: color })}
                          className={cn(
                            "size-9 rounded-2xl border-2 transition",
                            draft.colorHex === color
                              ? "border-foreground scale-105"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-foreground">مفعّل</p>
                    <p className="text-[11px] text-muted-foreground">
                      العناصر غير المفعّلة لا تظهر لأولياء الأمور.
                    </p>
                  </div>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(value) => setDraft({ ...draft, isActive: value })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => setDraft(null)}>
                  إلغاء
                </Button>
                <Button
                  className="rounded-2xl font-bold"
                  disabled={draft.nameAr.trim().length < 2 || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(draft)}
                >
                  {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-xs font-black text-muted-foreground">
      <Icon className="size-3.5 text-primary" />
      {value} {label}
    </span>
  );
}

function SubjectCard({
  subject,
  canEdit,
  open,
  toggle,
  onAddTopic,
  onEditSubject,
  onDeleteSubject,
  onAddLesson,
  onEditTopic,
  onDeleteTopic,
  onEditLesson,
  onDeleteLesson,
}: {
  subject: SubjectNode;
  canEdit: boolean;
  open: Record<string, boolean>;
  toggle: (key: string) => void;
  onAddTopic: () => void;
  onEditSubject: () => void;
  onDeleteSubject: () => void;
  onAddLesson: (topic: TopicNode) => void;
  onEditTopic: (topic: TopicNode) => void;
  onDeleteTopic: (topic: TopicNode) => void;
  onEditLesson: (topic: TopicNode, lesson: TopicNode["lessons"][number]) => void;
  onDeleteLesson: (lesson: TopicNode["lessons"][number]) => void;
}) {
  const expanded = open[subject.id] ?? true;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-sm">
      <header
        className="flex flex-wrap items-center gap-3 border-b border-border/50 p-4"
        style={{ backgroundColor: `${subject.colorHex}14` }}
      >
        <button
          type="button"
          onClick={() => toggle(subject.id)}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-black text-white"
            style={{ backgroundColor: subject.colorHex }}
          >
            {subject.nameAr.trim().charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-black text-foreground">{subject.nameAr}</span>
              {!subject.isActive && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  غير مفعّل
                </span>
              )}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {subject.topics.length} محور ·{" "}
              {subject.topics.reduce((n, t) => n + t.lessons.length, 0)} درس
            </span>
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition", expanded && "rotate-180")}
          />
        </button>

        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={onAddTopic}>
              <Plus className="size-3.5" />
              محور
            </Button>
            <Button size="icon" variant="ghost" className="rounded-xl" onClick={onEditSubject}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl text-destructive"
              onClick={onDeleteSubject}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </header>

      {expanded && (
        <div className="space-y-3 p-4">
          {subject.topics.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-xs font-bold text-muted-foreground">
              لا توجد محاور بعد داخل هذه المادة.
            </p>
          ) : (
            subject.topics.map((topic) => (
              <article key={topic.id} className="rounded-2xl border border-border/60 bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Layers className="size-4 shrink-0" style={{ color: subject.colorHex }} />
                  <p className="min-w-0 flex-1 truncate text-xs font-black text-foreground">
                    {topic.nameAr}
                    {!topic.isActive && (
                      <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        غير مفعّل
                      </span>
                    )}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-[11px] font-bold"
                        onClick={() => onAddLesson(topic)}
                      >
                        <Plus className="size-3.5" />
                        درس
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-xl"
                        onClick={() => onEditTopic(topic)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-xl text-destructive"
                        onClick={() => onDeleteTopic(topic)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {topic.lessons.length > 0 && (
                  <ul className="mt-2 space-y-1.5 ps-6">
                    {topic.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2"
                      >
                        <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-black text-foreground">
                            {lesson.nameAr}
                          </span>
                          {lesson.descriptionAr && (
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {lesson.descriptionAr}
                            </span>
                          )}
                        </span>
                        {canEdit && (
                          <span className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 rounded-lg"
                              onClick={() => onEditLesson(topic, lesson)}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 rounded-lg text-destructive"
                              onClick={() => onDeleteLesson(lesson)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
