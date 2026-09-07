import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  MessageCircle,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PrivateChatPanel } from "@/features/academics/components/PrivateChatPanel";
import { cn } from "@/lib/utils";
import {
  journeyAddEvidence,
  journeyAssignments,
  journeyDeleteEvidence,
  journeyDeletePlan,
  journeyDeleteSkill,
  journeySavePlan,
  journeySaveSkill,
  journeySetAssignments,
  journeyTeacherHub,
} from "../journey.functions";
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_KIND_LABELS,
  EVIDENCE_LIMITS_MB,
  SKILL_DOMAINS,
  formatWeekRange,
  weekStartOf,
} from "../journey";
import { uploadEvidence } from "../evidence-upload";

type PlanForm = {
  id: string | null;
  weekStart: string;
  title: string;
  subject: string;
  lessons: string;
  activities: string;
  notes: string;
  status: "draft" | "published";
};

const emptyPlan = (): PlanForm => ({
  id: null,
  weekStart: weekStartOf(),
  title: "",
  subject: "",
  lessons: "",
  activities: "",
  notes: "",
  status: "published",
});

export function TeacherHub() {
  const queryClient = useQueryClient();
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<PlanForm>(emptyPlan);

  const [skillName, setSkillName] = useState("");
  const [domain, setDomain] = useState<string>(SKILL_DOMAINS[0]);
  const [completion, setCompletion] = useState(60);
  const [improvement, setImprovement] = useState(30);
  const [note, setNote] = useState("");
  const [observedAt, setObservedAt] = useState(() => new Date().toISOString().slice(0, 10));

  const loadHub = useServerFn(journeyTeacherHub);
  const savePlanFn = useServerFn(journeySavePlan);
  const deletePlanFn = useServerFn(journeyDeletePlan);
  const saveSkillFn = useServerFn(journeySaveSkill);
  const deleteSkillFn = useServerFn(journeyDeleteSkill);
  const addEvidenceFn = useServerFn(journeyAddEvidence);
  const deleteEvidenceFn = useServerFn(journeyDeleteEvidence);
  const loadAssignments = useServerFn(journeyAssignments);
  const saveAssignmentsFn = useServerFn(journeySetAssignments);

  const hub = useQuery({
    queryKey: ["journey-hub", classroomId],
    queryFn: () => loadHub({ data: { classroomId } }),
  });

  const data = hub.data;
  const selectedClassroom = data?.selected ?? null;
  const [chatChild, setChatChild] = useState<{ id: string; name: string } | null>(null);
  const children = data?.children ?? [];
  const activeChildId = childId && children.some((c) => c.id === childId) ? childId : (children[0]?.id ?? null);
  const childSkills = useMemo(
    () => (data?.skills ?? []).filter((s) => s.childId === activeChildId),
    [data?.skills, activeChildId],
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["journey-hub"] });

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassroom) throw new Error("اختر الفصل أولًا.");
      if (plan.title.trim().length < 2) throw new Error("اكتب عنوان الخطة.");
      return savePlanFn({
        data: {
          id: plan.id,
          classroomId: selectedClassroom,
          weekStart: plan.weekStart,
          title: plan.title,
          subject: plan.subject,
          lessons: plan.lessons,
          activities: plan.activities,
          notes: plan.notes,
          status: plan.status,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ الخطة الأسبوعية");
      setPlanOpen(false);
      setPlan(emptyPlan());
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSkillMutation = useMutation({
    mutationFn: async () => {
      if (!activeChildId) throw new Error("اختر الطفل أولًا.");
      if (skillName.trim().length < 2) throw new Error("اكتب اسم المهارة أو النشاط.");
      return saveSkillFn({
        data: {
          childId: activeChildId,
          classroomId: selectedClassroom,
          skillName,
          domain,
          completion,
          improvement,
          note,
          observedAt,
        },
      });
    },
    onSuccess: () => {
      toast.success("تم رصد المهارة");
      setSkillName("");
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function handleEvidence(trackingId: string, file: File) {
    setUploadingFor(trackingId);
    try {
      const uploaded = await uploadEvidence(file, `${selectedClassroom ?? "misc"}/${activeChildId ?? "child"}`);
      await addEvidenceFn({ data: { trackingId, ...uploaded } });
      toast.success("تم إضافة الدليل الرقمي");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingFor(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-border/60 bg-card/90 p-4 shadow-soft">
        <span className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Users className="size-4 text-primary" /> الفصل
        </span>
        <Select
          value={selectedClassroom ?? undefined}
          onValueChange={(v) => {
            setClassroomId(v);
            setChildId(null);
          }}
        >
          <SelectTrigger className="w-64 rounded-2xl">
            <SelectValue placeholder="اختر الفصل" />
          </SelectTrigger>
          <SelectContent>
            {(data?.classrooms ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hub.isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {!hub.isLoading && !(data?.classrooms ?? []).length && (
          <p className="text-xs font-bold text-muted-foreground">
            لا توجد فصول مكلّفة لك بعد — يرجى مراجعة إدارة المدرسة.
          </p>
        )}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="plans" className="rounded-xl font-bold">
            الخطة الأسبوعية
          </TabsTrigger>
          <TabsTrigger value="skills" className="rounded-xl font-bold">
            مستكشف المهارات والإنجازات
          </TabsTrigger>
          {data?.isStaff && (
            <TabsTrigger value="assign" className="rounded-xl font-bold">
              تكليف المعلمات بالفصول
            </TabsTrigger>
          )}
        </TabsList>

        {/* Weekly plans */}
        <TabsContent value="plans" className="mt-4 space-y-4">
          <Button
            className="rounded-2xl font-bold"
            disabled={!selectedClassroom}
            onClick={() => {
              setPlan(emptyPlan());
              setPlanOpen(true);
            }}
          >
            <Plus className="size-4" /> خطة أسبوع جديدة
          </Button>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(data?.plans ?? []).map((p) => (
              <article
                key={p.id}
                className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-[11px] font-black text-primary">
                      <CalendarDays className="size-3.5" /> {formatWeekRange(p.weekStart)}
                    </p>
                    <h3 className="mt-1 text-base font-extrabold text-foreground">{p.title}</h3>
                    {p.subject && <p className="text-xs font-bold text-muted-foreground">{p.subject}</p>}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-black",
                      p.status === "published" ? "bg-mint/70 text-foreground" : "bg-beige text-foreground",
                    )}
                  >
                    {p.status === "published" ? "منشورة" : "مسودة"}
                  </span>
                </div>
                {p.lessons && (
                  <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {p.lessons}
                  </p>
                )}
                {p.activities && (
                  <p className="mt-2 whitespace-pre-line rounded-2xl bg-sky/30 p-3 text-xs leading-relaxed text-foreground">
                    الأنشطة: {p.activities}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-bold"
                    onClick={() => {
                      setPlan({
                        id: p.id,
                        weekStart: p.weekStart,
                        title: p.title,
                        subject: p.subject ?? "",
                        lessons: p.lessons ?? "",
                        activities: p.activities ?? "",
                        notes: p.notes ?? "",
                        status: p.status === "draft" ? "draft" : "published",
                      });
                      setPlanOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-xl font-bold text-destructive"
                    onClick={async () => {
                      await deletePlanFn({ data: { id: p.id } });
                      toast.success("تم حذف الخطة");
                      refresh();
                    }}
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              </article>
            ))}
            {!(data?.plans ?? []).length && !hub.isLoading && (
              <p className="rounded-[1.5rem] border border-dashed border-border/70 p-6 text-sm font-bold text-muted-foreground">
                لا توجد خطط أسبوعية لهذا الفصل بعد.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Skills & evidence */}
        <TabsContent value="skills" className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-1.5 rounded-[1.5rem] border border-border/60 bg-card/90 p-3 shadow-soft">
            {children.map((c) => (
              <div key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChildId(c.id)}
                  className={cn(
                    "flex-1 rounded-2xl px-3 py-2.5 text-right text-sm font-bold transition-colors",
                    activeChildId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  title={`شات فردي مع ولي أمر ${c.name}`}
                  aria-label={`شات فردي مع ولي أمر ${c.name}`}
                  className="size-9 shrink-0 rounded-xl text-primary hover:bg-primary/10"
                  onClick={() => setChatChild({ id: c.id, name: c.name })}
                >
                  <MessageCircle className="size-4" />
                </Button>
              </div>
            ))}
            {!children.length && (
              <p className="p-3 text-xs font-bold text-muted-foreground">لا يوجد أطفال مسكّنون في هذا الفصل.</p>
            )}
          </aside>

          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Sparkles className="size-4 text-gold" /> رصد مهارة جديدة
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">اسم المهارة / النشاط</Label>
                  <Input
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="مثال: حفظ سورة الفاتحة"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">المجال</Label>
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_DOMAINS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">نسبة الإكمال — {completion}%</Label>
                  <Slider value={[completion]} max={100} step={5} onValueChange={(v) => setCompletion(v[0] ?? 0)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">نسبة التحسّن — {improvement}%</Label>
                  <Slider
                    value={[improvement]}
                    max={100}
                    step={5}
                    onValueChange={(v) => setImprovement(v[0] ?? 0)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">تاريخ الرصد</Label>
                  <Input
                    type="date"
                    value={observedAt}
                    onChange={(e) => setObservedAt(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold">ملاحظة المعلمة لولي الأمر</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <Button
                className="mt-4 rounded-2xl font-bold"
                disabled={!activeChildId || saveSkillMutation.isPending}
                onClick={() => saveSkillMutation.mutate()}
              >
                {saveSkillMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                حفظ الرصد
              </Button>
            </section>

            <input
              ref={fileInput}
              type="file"
              accept={EVIDENCE_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                const trackingId = e.target.dataset["tracking"];
                e.target.value = "";
                if (file && trackingId) void handleEvidence(trackingId, file);
              }}
            />

            <div className="space-y-3">
              {childSkills.map((s) => (
                <article key={s.id} className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-foreground">{s.skillName}</h4>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {s.domain ?? "—"} · {s.observedAt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-bold"
                        disabled={uploadingFor === s.id}
                        onClick={() => {
                          if (!fileInput.current) return;
                          fileInput.current.dataset["tracking"] = s.id;
                          fileInput.current.click();
                        }}
                      >
                        {uploadingFor === s.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="size-3.5" />
                        )}
                        إضافة دليل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl font-bold text-destructive"
                        onClick={async () => {
                          await deleteSkillFn({ data: { id: s.id } });
                          toast.success("تم حذف الرصد");
                          refresh();
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground">الإكمال {s.completion}%</p>
                      <Progress value={s.completion} className="mt-1 h-2" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground">التحسّن {s.improvement}%</p>
                      <Progress value={s.improvement} className="mt-1 h-2" />
                    </div>
                  </div>

                  {s.note && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.note}</p>}

                  {!!s.evidences.length && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {s.evidences.map((ev) => (
                        <li key={ev.id} className="flex items-center gap-2 rounded-2xl bg-beige/60 px-3 py-1.5">
                          <span className="text-[11px] font-bold text-foreground">
                            {EVIDENCE_KIND_LABELS[ev.fileType]}
                          </span>
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-black text-primary underline"
                            >
                              معاينة
                            </a>
                          )}
                          <button
                            type="button"
                            className="text-destructive"
                            onClick={async () => {
                              await deleteEvidenceFn({ data: { id: ev.id } });
                              refresh();
                            }}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
              {!childSkills.length && activeChildId && (
                <p className="rounded-[1.5rem] border border-dashed border-border/70 p-6 text-sm font-bold text-muted-foreground">
                  لا توجد مهارات مرصودة لهذا الطفل بعد.
                </p>
              )}
            </div>

            <p className="text-[11px] font-bold text-muted-foreground">
              حدود المرفقات: صورة {EVIDENCE_LIMITS_MB.image} م.ب · فيديو {EVIDENCE_LIMITS_MB.video} م.ب · صوت{" "}
              {EVIDENCE_LIMITS_MB.audio} م.ب — الصور تُضغط تلقائيًا.
            </p>
          </div>
        </TabsContent>

        {data?.isStaff && (
          <TabsContent value="assign" className="mt-4">
            <AssignmentsPanel loadAssignments={loadAssignments} saveAssignments={saveAssignmentsFn} />
          </TabsContent>
        )}
      </Tabs>

      {/* Weekly plan dialog */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-extrabold">
              {plan.id ? "تعديل الخطة الأسبوعية" : "خطة أسبوعية جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">بداية الأسبوع</Label>
                <Input
                  type="date"
                  value={plan.weekStart}
                  onChange={(e) => setPlan({ ...plan, weekStart: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">المادة / المهارة</Label>
                <Input
                  value={plan.subject}
                  onChange={(e) => setPlan({ ...plan, subject: e.target.value })}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">عنوان الخطة</Label>
              <Input
                value={plan.title}
                onChange={(e) => setPlan({ ...plan, title: e.target.value })}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ملخص الدروس</Label>
              <Textarea
                rows={3}
                value={plan.lessons}
                onChange={(e) => setPlan({ ...plan, lessons: e.target.value })}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الأنشطة المقترحة</Label>
              <Textarea
                rows={3}
                value={plan.activities}
                onChange={(e) => setPlan({ ...plan, activities: e.target.value })}
                className="rounded-2xl"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Checkbox
                checked={plan.status === "published"}
                onCheckedChange={(v) => setPlan({ ...plan, status: v ? "published" : "draft" })}
              />
              نشر الخطة لأولياء الأمور
            </label>
          </div>
          <DialogFooter>
            <Button
              className="rounded-2xl font-bold"
              disabled={savePlanMutation.isPending}
              onClick={() => savePlanMutation.mutate()}
            >
              {savePlanMutation.isPending && <Loader2 className="size-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type AssignmentsProps = {
  loadAssignments: () => Promise<{
    teachers: { id: string; name: string; email: string | null; classroomIds: string[] }[];
    classrooms: { id: string; name_ar: string }[];
  }>;
  saveAssignments: (opts: { data: { teacherId: string; classroomIds: string[] } }) => Promise<unknown>;
};

function AssignmentsPanel({ loadAssignments, saveAssignments }: AssignmentsProps) {
  const queryClient = useQueryClient();
  const assignments = useQuery({ queryKey: ["journey-assignments"], queryFn: () => loadAssignments() });

  async function toggle(teacherId: string, current: string[], classroomId: string) {
    const next = current.includes(classroomId)
      ? current.filter((c) => c !== classroomId)
      : [...current, classroomId];
    try {
      await saveAssignments({ data: { teacherId, classroomIds: next } });
      toast.success("تم تحديث تكليف الفصول");
      await queryClient.invalidateQueries({ queryKey: ["journey-assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["journey-hub"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      {(assignments.data?.teachers ?? []).map((t) => (
        <article key={t.id} className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft">
          <p className="text-sm font-extrabold text-foreground">{t.name}</p>
          <p className="text-[11px] font-bold text-muted-foreground" dir="ltr">
            {t.email ?? ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(assignments.data?.classrooms ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Checkbox
                  checked={t.classroomIds.includes(c.id)}
                  onCheckedChange={() => void toggle(t.id, t.classroomIds, c.id)}
                />
                {c.name_ar}
              </label>
            ))}
          </div>
        </article>
      ))}
      {!(assignments.data?.teachers ?? []).length && !assignments.isLoading && (
        <p className="rounded-[1.5rem] border border-dashed border-border/70 p-6 text-sm font-bold text-muted-foreground">
          لا توجد حسابات بدور «معلمة» بعد — أضِف الدور من صفحة المستخدمون والأدوار.
        </p>
      )}
    </div>
  );
}