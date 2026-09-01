/**
 * Study Plan Builder — teachers and staff drag lessons from the curriculum tree
 * onto a Sunday→Thursday grid, then save, export, or share the plan straight
 * into the classroom chat room.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ChevronDown,
  FileDown,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { academicsClassrooms, academicsCurriculum } from "../academics.functions";
import { chatSendMessage } from "../chat.functions";
import { exportPlanImage, exportPlanPdf, planImageAttachment } from "../plan-export";
import {
  PLAN_TYPE_LABELS,
  SCHOOL_DAYS,
  defaultRange,
  formatPlanRange,
  planTitle,
  type PlanType,
  type StudyPlan,
} from "../plans";
import { plansDelete, plansForClassroom, plansSave, plansSetPublished } from "../plans.functions";
import { StudyPlanGrid } from "./StudyPlanGrid";

type DraftItem = {
  key: string;
  lessonId: string | null;
  lessonNameAr: string;
  subjectNameAr: string | null;
  colorHex: string;
  scheduledDay: number;
  scheduledTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
};

type Draft = {
  id: string | null;
  planType: PlanType;
  titleAr: string;
  notes: string;
  startDate: string;
  endDate: string;
  published: boolean;
  items: DraftItem[];
};

function emptyDraft(type: PlanType = "weekly"): Draft {
  const range = defaultRange(type);
  return {
    id: null,
    planType: type,
    titleAr: "",
    notes: "",
    published: false,
    ...range,
    items: [],
  };
}

function draftToPlan(draft: Draft, classroomId: string, classroomName: string | null, stageName: string | null): StudyPlan {
  return {
    id: draft.id ?? "draft",
    classroomId,
    classroomName,
    stageName,
    planType: draft.planType,
    titleAr: draft.titleAr || null,
    notes: draft.notes || null,
    startDate: draft.startDate,
    endDate: draft.endDate,
    published: draft.published,
    createdAt: new Date().toISOString(),
    items: draft.items.map((item, index) => ({
      id: item.key,
      lessonId: item.lessonId,
      lessonNameAr: item.lessonNameAr,
      subjectNameAr: item.subjectNameAr,
      colorHex: item.colorHex,
      scheduledDay: item.scheduledDay,
      scheduledTime: item.scheduledTime,
      durationMinutes: item.durationMinutes,
      notes: item.notes,
      sortOrder: index,
    })),
  };
}

type DragPayload = {
  lessonId: string;
  lessonNameAr: string;
  subjectNameAr: string;
  colorHex: string;
};

function LessonCard({
  id,
  label,
  subject,
  colorHex,
  onDragStart,
}: {
  id: string;
  label: string;
  subject: string;
  colorHex: string;
  onDragStart: (payload: DragPayload) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", label);
        onDragStart({ lessonId: id, lessonNameAr: label, subjectNameAr: subject, colorHex });
      }}
      className="flex cursor-grab items-center gap-2 rounded-xl border border-border/60 bg-background p-2 text-xs font-bold shadow-sm transition hover:border-primary/50 active:opacity-60"
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorHex }} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}

function DayColumn({
  day,
  label,
  onDropLesson,
  children,
}: {
  day: number;
  label: string;
  onDropLesson: (day: number) => void;
  children: React.ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        onDropLesson(day);
      }}
      className={cn(
        "flex min-h-56 flex-col rounded-2xl border-2 border-dashed border-border/70 bg-background/60 p-2 transition",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <h4 className="mb-2 text-center text-xs font-black text-foreground">{label}</h4>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </section>
  );
}

export function StudyPlanBuilder() {
  const queryClient = useQueryClient();
  const loadClassrooms = useServerFn(academicsClassrooms);
  const loadCurriculum = useServerFn(academicsCurriculum);
  const loadPlans = useServerFn(plansForClassroom);
  const saveFn = useServerFn(plansSave);
  const deleteFn = useServerFn(plansDelete);
  const publishFn = useServerFn(plansSetPublished);
  const sendChat = useServerFn(chatSendMessage);

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const dragged = useRef<DragPayload | null>(null);

  const classroomsQuery = useQuery({
    queryKey: ["academics-classrooms"],
    queryFn: () => loadClassrooms({}),
  });
  const classrooms = classroomsQuery.data?.classrooms ?? [];

  useEffect(() => {
    if (!classroomId && classrooms.length) setClassroomId(classrooms[0]!.id);
  }, [classroomId, classrooms]);

  const activeClassroom = useMemo(
    () => classrooms.find((c) => c.id === classroomId) ?? null,
    [classrooms, classroomId],
  );

  const curriculum = useQuery({
    queryKey: ["academics-curriculum", classroomId],
    queryFn: () => loadCurriculum({ data: { classroomId: classroomId! } }),
    enabled: Boolean(classroomId),
  });

  const plans = useQuery({
    queryKey: ["study-plans", classroomId],
    queryFn: () => loadPlans({ data: { classroomId: classroomId! } }),
    enabled: Boolean(classroomId),
  });

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          id: draft.id,
          classroomId: classroomId!,
          planType: draft.planType,
          titleAr: draft.titleAr || null,
          notes: draft.notes || null,
          startDate: draft.startDate,
          endDate: draft.endDate,
          published: draft.published,
          items: draft.items.map((item) => ({
            lessonId: item.lessonId,
            lessonNameAr: item.lessonNameAr,
            subjectNameAr: item.subjectNameAr,
            colorHex: item.colorHex,
            scheduledDay: item.scheduledDay,
            scheduledTime: item.scheduledTime,
            durationMinutes: item.durationMinutes,
            notes: item.notes,
          })),
        },
      }),
    onSuccess: (res) => {
      setDraft((prev) => ({ ...prev, id: res.id }));
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("تم حفظ الخطة الدراسية.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      setDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("تم حذف الخطة.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async (input: { id: string; published: boolean }) => publishFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      toast.success("تم تحديث حالة النشر لأولياء الأمور.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addLesson(day: number) {
    const payload = dragged.current;
    if (!payload) return;
    dragged.current = null;
    setDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: crypto.randomUUID(),
          lessonId: payload.lessonId,
          lessonNameAr: payload.lessonNameAr,
          subjectNameAr: payload.subjectNameAr,
          colorHex: payload.colorHex,
          scheduledDay: day,
          scheduledTime: null,
          durationMinutes: 30,
          notes: null,
        },
      ],
    }));
  }

  function patchItem(key: string, patch: Partial<DraftItem>) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    }));
  }

  function loadPlanIntoDraft(plan: StudyPlan) {
    setDraft({
      id: plan.id,
      planType: plan.planType,
      titleAr: plan.titleAr ?? "",
      notes: plan.notes ?? "",
      startDate: plan.startDate,
      endDate: plan.endDate,
      published: plan.published,
      items: plan.items.map((item) => ({
        key: item.id,
        lessonId: item.lessonId,
        lessonNameAr: item.lessonNameAr,
        subjectNameAr: item.subjectNameAr,
        colorHex: item.colorHex,
        scheduledDay: item.scheduledDay,
        scheduledTime: item.scheduledTime,
        durationMinutes: item.durationMinutes,
        notes: item.notes,
      })),
    });
  }

  const previewPlan = useMemo(
    () =>
      draftToPlan(
        draft,
        classroomId ?? "",
        activeClassroom?.nameAr ?? null,
        activeClassroom?.stageNameAr ?? null,
      ),
    [draft, classroomId, activeClassroom],
  );

  async function runExport(kind: "png" | "pdf" | "chat") {
    const node = exportRef.current;
    if (!node) return;
    if (!draft.items.length) {
      toast.error("أضف دروسًا إلى الخطة أولًا.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "png") await exportPlanImage(node, previewPlan);
      else if (kind === "pdf") await exportPlanPdf(node, previewPlan);
      else {
        const attachment = await planImageAttachment(node, previewPlan);
        await sendChat({
          data: {
            classroomId: classroomId!,
            body: `الخطة الدراسية: ${planTitle(previewPlan)}\n${formatPlanRange(previewPlan)}`,
            attachments: [attachment],
          },
        });
        toast.success("تم نشر الخطة في محادثة الفصل.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (classroomsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!classrooms.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        لا توجد فصول متاحة لصلاحيتك، لذلك لا يمكن بناء خطط دراسية.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-52">
          <Label className="mb-1 block text-xs">الفصل</Label>
          <Select
            value={classroomId ?? undefined}
            onValueChange={(value) => {
              setClassroomId(value);
              setDraft(emptyDraft(draft.planType));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nameAr} — {c.stageNameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-40">
          <Label className="mb-1 block text-xs">نوع الخطة</Label>
          <Select
            value={draft.planType}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                planType: value as PlanType,
                ...defaultRange(value as PlanType),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">{PLAN_TYPE_LABELS.weekly}</SelectItem>
              <SelectItem value="monthly">{PLAN_TYPE_LABELS.monthly}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs">من</Label>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">إلى</Label>
          <Input
            type="date"
            value={draft.endDate}
            onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
        <div className="min-w-52 flex-1">
          <Label className="mb-1 block text-xs">عنوان الخطة (اختياري)</Label>
          <Input
            value={draft.titleAr}
            placeholder="مثال: خطة الأسبوع الثالث"
            onChange={(e) => setDraft((prev) => ({ ...prev, titleAr: e.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs font-bold">
          <Switch
            checked={draft.published}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, published: checked }))}
          />
          نشر لأولياء الأمور
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending || !classroomId}>
            {save.isPending ? <Loader2 className="me-1 size-4 animate-spin" /> : <Save className="me-1 size-4" />}
            حفظ الخطة
          </Button>
          <Button variant="outline" onClick={() => setDraft(emptyDraft(draft.planType))}>
            <Plus className="me-1 size-4" /> خطة جديدة
          </Button>
          <Button variant="outline" disabled={busy === "pdf"} onClick={() => runExport("pdf")}>
            {busy === "pdf" ? <Loader2 className="me-1 size-4 animate-spin" /> : <FileDown className="me-1 size-4" />}
            PDF
          </Button>
          <Button variant="outline" disabled={busy === "png"} onClick={() => runExport("png")}>
            {busy === "png" ? <Loader2 className="me-1 size-4 animate-spin" /> : <ImageIcon className="me-1 size-4" />}
            صورة
          </Button>
          <Button variant="secondary" disabled={busy === "chat"} onClick={() => runExport("chat")}>
            {busy === "chat" ? <Loader2 className="me-1 size-4 animate-spin" /> : <Send className="me-1 size-4" />}
            مشاركة في محادثة الفصل
          </Button>
        </div>
      </Card>

        <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
          <Card className="h-fit p-3 xl:sticky xl:top-24">
            <p className="px-1 pb-2 text-xs font-black text-muted-foreground">
              منهج الفصل — اسحب الدرس إلى اليوم المناسب
            </p>
            {curriculum.isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : !curriculum.data?.length ? (
              <p className="p-3 text-xs text-muted-foreground">
                لا يوجد منهج لهذا الفصل بعد — أضِفه من «إدارة المنهج».
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {curriculum.data.map((subject) => {
                  const open = openSubjects[subject.id] ?? true;
                  return (
                    <div key={subject.id} className="rounded-xl border border-border/60">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSubjects((prev) => ({ ...prev, [subject.id]: !open }))
                        }
                        className="flex w-full items-center gap-2 p-2 text-start text-xs font-black"
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: subject.colorHex }}
                        />
                        <span className="min-w-0 flex-1 truncate">{subject.nameAr}</span>
                        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
                      </button>
                      {open ? (
                        <div className="flex flex-col gap-2 p-2 pt-0">
                          {subject.topics.map((topic) => (
                            <div key={topic.id}>
                              <p className="mb-1 text-[11px] font-bold text-muted-foreground">
                                {topic.nameAr}
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {topic.lessons.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground">لا توجد دروس</p>
                                ) : (
                                  topic.lessons.map((lesson) => (
                                    <LessonCard
                                      key={lesson.id}
                                      id={lesson.id}
                                      label={lesson.nameAr}
                                      subject={subject.nameAr}
                                      colorHex={subject.colorHex}
                                      onDragStart={(payload) => {
                                        dragged.current = payload;
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <p className="text-sm font-black text-foreground">
                  {planTitle(previewPlan)}
                </p>
                <Badge variant="secondary" className="ms-auto">
                  {draft.items.length} درس
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {SCHOOL_DAYS.map((d) => (
                  <DayColumn key={d.day} day={d.day} label={d.label} onDropLesson={addLesson}>
                    {draft.items
                      .filter((item) => item.scheduledDay === d.day)
                      .map((item) => (
                        <article
                          key={item.key}
                          className="rounded-xl border-s-4 bg-card p-2 shadow-sm"
                          style={{ borderInlineStartColor: item.colorHex }}
                        >
                          <p className="text-xs font-black text-foreground">{item.lessonNameAr}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.scheduledTime ?? "بدون وقت"}
                            {item.durationMinutes ? ` · ${item.durationMinutes} د` : ""}
                          </p>
                          {item.notes ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {item.notes}
                            </p>
                          ) : null}
                          <div className="mt-1 flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
                                  تفاصيل
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 space-y-3" align="start">
                                <div>
                                  <Label className="mb-1 block text-xs">الوقت</Label>
                                  <Input
                                    type="time"
                                    value={item.scheduledTime ?? ""}
                                    onChange={(e) =>
                                      patchItem(item.key, { scheduledTime: e.target.value || null })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">المدة (دقيقة)</Label>
                                  <Input
                                    type="number"
                                    min={5}
                                    max={480}
                                    value={item.durationMinutes ?? ""}
                                    onChange={(e) =>
                                      patchItem(item.key, {
                                        durationMinutes: e.target.value ? Number(e.target.value) : null,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs">ملاحظات</Label>
                                  <Textarea
                                    rows={3}
                                    value={item.notes ?? ""}
                                    onChange={(e) => patchItem(item.key, { notes: e.target.value || null })}
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              onClick={() =>
                                setDraft((prev) => ({
                                  ...prev,
                                  items: prev.items.filter((i) => i.key !== item.key),
                                }))
                              }
                              aria-label="إزالة الدرس"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </article>
                      ))}
                  </DayColumn>
                ))}
              </div>

              <div className="mt-3">
                <Label className="mb-1 block text-xs">ملاحظات عامة على الخطة</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  placeholder="رسالة قصيرة لأولياء الأمور…"
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </Card>

            <Card className="p-4">
              <p className="mb-3 text-xs font-black text-muted-foreground">خطط هذا الفصل</p>
              {plans.isLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : !plans.data?.length ? (
                <p className="text-xs text-muted-foreground">لا توجد خطط محفوظة بعد.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {plans.data.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black">{planTitle(plan)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {formatPlanRange(plan)} · {plan.items.length} درس
                        </p>
                      </div>
                      <Badge variant={plan.published ? "default" : "secondary"}>
                        {plan.published ? "منشورة" : "مسودة"}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => loadPlanIntoDraft(plan)}>
                        تحرير
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => publish.mutate({ id: plan.id, published: !plan.published })}
                      >
                        {plan.published ? "إلغاء النشر" : "نشر"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(plan.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

      {/* Off-screen render used for PDF / image / chat export. */}
      <div className="pointer-events-none fixed -left-[3000px] top-0 w-[1100px] opacity-0" aria-hidden>
        <div ref={exportRef} className="bg-white p-4">
          <StudyPlanGrid plan={previewPlan} />
        </div>
      </div>
    </div>
  );
}
