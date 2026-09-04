import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Copy,

  ChevronUp,
  Download,
  FileSpreadsheet,
  GripVertical,
  ListChecks,
  Plus,
  Save,
  Send,
  Star,
  Trash2,
  Type,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { exportExcel } from "@/features/ams/reports-export";
import { ReportLetterhead } from "@/components/reports/ReportLetterhead";
import {
  AUDIENCE_LABELS,
  QUESTION_TYPE_LABELS,
  SNOOZE_OPTIONS,
  SURVEY_STATUS_LABELS,
  type QuestionDraft,
  type QuestionType,
  type StageWithClassrooms,
  type SurveyAudienceKind,
  type SurveyDraft,
  type SurveyWithQuestions,
  listStagesWithClassrooms,
  emptySurveyDraft,
  draftFromSurvey,
  loadSurveyResults,
  saveSurvey,
  setSurveyStatus,
  deleteSurvey,
  validateDraft,
} from "../surveys";

type Props = { surveys: SurveyWithQuestions[]; onRefresh: () => Promise<void> };

/**
 * Explicit report palette: CSS variables in this project are `oklch(...)`
 * values, so `hsl(var(--token))` produced invalid colors that Recharts painted
 * black. Fixed hex values keep charts vivid on screen and in PDF exports.
 */
const COLORS = [
  "#7B1E3A",
  "#C99A2E",
  "#2F7D6B",
  "#3A6EA5",
  "#8E6BC1",
  "#D2694A",
  "#4FA3A1",
  "#B5476B",
];
const AXIS_COLOR = "#6B5560";
const GRID_COLOR = "#E3D8DC";


function toInputDate(value: string | null) {
  return value ? value.slice(0, 16) : "";
}
function fromInputDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}
function questionIcon(type: QuestionType) {
  if (type === "text") return Type;
  if (type === "rating_stars") return Star;
  return ListChecks;
}

export function SurveyManager({ surveys, onRefresh }: Props) {
  const [draft, setDraft] = useState<SurveyDraft | null>(null);
  const [tab, setTab] = useState("surveys");
  const [saving, setSaving] = useState(false);
  const [analyticsId, setAnalyticsId] = useState<string>(surveys[0]?.id ?? "");
  const confirm = useConfirm();

  async function commit(next: SurveyDraft) {
    const validation = validateDraft(next);
    if (validation) {
      toast.error(validation);
      return;
    }
    setSaving(true);
    try {
      await saveSurvey(next);
      toast.success(
        next.status === "active" ? "تم نشر الاستبانة بنجاح" : "تم حفظ الاستبانة كمسودة",
      );
      setDraft(null);
      await onRefresh();
      setTab("surveys");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الاستبانة");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(survey: SurveyWithQuestions, status: "active" | "closed") {
    try {
      await setSurveyStatus(survey.id, status);
      toast.success(status === "active" ? "تم نشر الاستبانة" : "تم إغلاق الاستبانة");
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    }
  }

  async function remove(survey: SurveyWithQuestions) {
    if (
      !(await confirm({
        title: "حذف الاستبانة؟",
        description: "سيتم حذف الأسئلة والاستجابات المرتبطة بها نهائيًا.",
        tone: "danger",
        confirmLabel: "حذف الاستبانة",
      }))
    )
      return;
    try {
      await deleteSurvey(survey.id);
      toast.success("تم حذف الاستبانة");
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الاستبانة");
    }
  }

  /** Open a fresh draft prefilled from an existing survey (questions + settings). */
  function duplicate(survey: SurveyWithQuestions) {
    const source = draftFromSurvey(survey);
    setDraft({
      ...source,
      id: undefined,
      title: `${survey.title} (نسخة)`,
      status: "draft",
      questions: source.questions.map(({ id: _id, ...question }) => ({ ...question })),
    });
    setTab("surveys");
    toast.success("تم إنشاء نسخة قابلة للتعديل قبل النشر");
  }



  if (draft) {
    return (
      <SurveyBuilder
        draft={draft}
        saving={saving}
        onChange={setDraft}
        onCancel={() => setDraft(null)}
        onSave={commit}
      />
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-2xl bg-beige/70 p-1 sm:w-auto">
          <TabsTrigger value="surveys" className="rounded-xl px-4 py-2 font-bold">
            الاستبانات
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl px-4 py-2 font-bold">
            التحليلات والتقارير
          </TabsTrigger>
        </TabsList>
        <Button onClick={() => setDraft(emptySurveyDraft())} className="rounded-2xl font-black">
          <Plus className="size-4" /> استبانة جديدة
        </Button>
      </div>

      <TabsContent value="surveys" className="mt-0 space-y-4">
        {surveys.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed border-border/70 bg-card p-12 text-center">
            <ListChecks className="mx-auto size-12 text-primary/60" />
            <h2 className="mt-4 text-lg font-black text-foreground">
              ابدأ بقياس تجربة أولياء الأمور
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              أنشئ استبانة ديناميكية واجمع آراءً تساعد المدرسة على التطور.
            </p>
          </div>
        ) : (
          surveys.map((survey) => (
            <article
              key={survey.id}
              className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <ListChecks className="size-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-foreground">{survey.title}</h2>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${survey.status === "active" ? "bg-mint/50 text-foreground" : survey.status === "closed" ? "bg-muted text-muted-foreground" : "bg-gold/40 text-foreground"}`}
                      >
                        {SURVEY_STATUS_LABELS[survey.status]}
                      </span>
                      {survey.is_mandatory ? (
                        <span className="rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-black text-destructive">
                          إلزامية
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {survey.description || "بدون وصف إضافي"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">
                        {survey.questions.length} أسئلة
                      </span>
                      {survey.start_date ? (
                        <span className="rounded-full bg-muted px-3 py-1">
                          تبدأ {new Date(survey.start_date).toLocaleDateString("ar-SA")}
                        </span>
                      ) : null}
                      {survey.end_date ? (
                        <span className="rounded-full bg-muted px-3 py-1">
                          تنتهي {new Date(survey.end_date).toLocaleDateString("ar-SA")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={() => {
                      setDraft(draftFromSurvey(survey));
                      setTab("surveys");
                    }}
                  >
                    <ChevronDown className="size-4" /> تعديل
                  </Button>
                  {survey.status === "draft" || survey.status === "closed" ? (
                    <Button
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => changeStatus(survey, "active")}
                    >
                      <Send className="size-4" /> نشر
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-bold"
                      onClick={() => changeStatus(survey, "closed")}
                    >
                      إغلاق
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="حذف الاستبانة"
                    onClick={() => remove(survey)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </TabsContent>

      <TabsContent value="analytics" className="mt-0">
        <AnalyticsPanel surveys={surveys} selectedId={analyticsId} onSelect={setAnalyticsId} />
      </TabsContent>
    </Tabs>
  );
}

function SurveyBuilder({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: SurveyDraft;
  saving: boolean;
  onChange: (draft: SurveyDraft) => void;
  onCancel: () => void;
  onSave: (draft: SurveyDraft) => void;
}) {
  const [stages, setStages] = useState<StageWithClassrooms[]>([]);
  useEffect(() => {
    listStagesWithClassrooms()
      .then(setStages)
      .catch(() => {
        /* Targeting stays optional when the stage tree is unavailable. */
      });
  }, []);

  const update = (patch: Partial<SurveyDraft>) => onChange({ ...draft, ...patch });
  const toggleStage = (id: string) =>
    update({
      target_stage_ids: draft.target_stage_ids.includes(id)
        ? draft.target_stage_ids.filter((item) => item !== id)
        : [...draft.target_stage_ids, id],
    });
  const toggleClassroom = (id: string) =>
    update({
      target_classroom_ids: draft.target_classroom_ids.includes(id)
        ? draft.target_classroom_ids.filter((item) => item !== id)
        : [...draft.target_classroom_ids, id],
    });
  const addQuestion = () =>
    onChange({
      ...draft,
      questions: [
        ...draft.questions,
        { question_text: "", question_type: "text", is_required: true, options: [] },
      ],
    });
  const updateQuestion = (index: number, patch: Partial<QuestionDraft>) =>
    onChange({
      ...draft,
      questions: draft.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    });
  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= draft.questions.length) return;
    const questions = draft.questions.slice();
    [questions[index], questions[next]] = [questions[next], questions[index]];
    onChange({ ...draft, questions });
  };
  const remove = (index: number) =>
    onChange({ ...draft, questions: draft.questions.filter((_, i) => i !== index) });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black text-primary">استبانة جديدة</p>
          <h2 className="mt-1 text-2xl font-black text-foreground">صمّم تجربة الاستبانة</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="rounded-2xl font-bold">
            إلغاء
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onSave({ ...draft, status: "draft" })}
            className="rounded-2xl font-bold"
          >
            <Save className="size-4" /> حفظ كمسودة
          </Button>
          <Button
            disabled={saving}
            onClick={() => onSave({ ...draft, status: "active" })}
            className="rounded-2xl font-black"
          >
            <Send className="size-4" /> حفظ ونشر
          </Button>
        </div>
      </div>
      <Tabs defaultValue="setup" className="space-y-5">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-beige/70 p-1">
          <TabsTrigger value="setup" className="rounded-xl font-bold">
            الإعداد الأساسي
          </TabsTrigger>
          <TabsTrigger value="display" className="rounded-xl font-bold">
            إعدادات الظهور
          </TabsTrigger>
          <TabsTrigger value="questions" className="rounded-xl font-bold">
            الأسئلة ({draft.questions.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="setup" className="mt-0">
          <div className="grid gap-5 rounded-[1.75rem] border border-border/60 bg-card p-5 sm:grid-cols-2 sm:p-7">
            <div className="sm:col-span-2">
              <Label htmlFor="survey-title" className="font-black">
                عنوان الاستبانة
              </Label>
              <Input
                id="survey-title"
                maxLength={160}
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="مثال: قياس رضا أولياء الأمور عن الفصل الدراسي"
                className="mt-2 h-12 rounded-2xl"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="survey-description" className="font-black">
                وصف وتعريف مختصر
              </Label>
              <Textarea
                id="survey-description"
                maxLength={1000}
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="اكتب رسالة لطيفة توضّح الهدف من المشاركة..."
                className="mt-2 min-h-28 rounded-2xl"
              />
            </div>
            <div>
              <Label htmlFor="survey-start" className="font-black">
                تاريخ البداية
              </Label>
              <Input
                id="survey-start"
                type="datetime-local"
                value={toInputDate(draft.start_date)}
                onChange={(e) => update({ start_date: fromInputDate(e.target.value) })}
                className="mt-2 h-12 rounded-2xl"
              />
            </div>
            <div>
              <Label htmlFor="survey-end" className="font-black">
                تاريخ النهاية
              </Label>
              <Input
                id="survey-end"
                type="datetime-local"
                value={toInputDate(draft.end_date)}
                onChange={(e) => update({ end_date: fromInputDate(e.target.value) })}
                className="mt-2 h-12 rounded-2xl"
              />
            </div>
            <div className="sm:col-span-2 border-t border-border/60 pt-5">
              <Label className="font-black">الجمهور المستهدف</Label>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                حدّد من يرى هذه الاستبانة: جميع أولياء الأمور، أو أولياء أمور مراحل محددة، أو فصول
                محددة داخل مرحلة.
              </p>
              <Select
                value={draft.audience_kind}
                onValueChange={(value) =>
                  update({
                    audience_kind: value as SurveyAudienceKind,
                    target_stage_ids: value === "stages" ? draft.target_stage_ids : [],
                    target_classroom_ids: value === "classrooms" ? draft.target_classroom_ids : [],
                  })
                }
              >
                <SelectTrigger className="mt-3 h-12 w-full rounded-2xl sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIENCE_LABELS) as SurveyAudienceKind[]).map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {AUDIENCE_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {draft.audience_kind === "stages" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stages.map((stage) => {
                    const active = draft.target_stage_ids.includes(stage.id);
                    return (
                      <button
                        type="button"
                        key={stage.id}
                        onClick={() => toggleStage(stage.id)}
                        className={`rounded-xl border px-4 py-2 text-xs font-black transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
                      >
                        {stage.name_ar}
                      </button>
                    );
                  })}
                  {!stages.length ? (
                    <p className="text-xs font-bold text-muted-foreground">لا توجد مراحل معرّفة.</p>
                  ) : null}
                </div>
              ) : null}

              {draft.audience_kind === "classrooms" ? (
                <div className="mt-4 space-y-3">
                  {stages.map((stage) => (
                    <div key={stage.id} className="rounded-2xl border border-border/60 p-3">
                      <p className="text-xs font-black text-foreground">{stage.name_ar}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {stage.classrooms.length ? (
                          stage.classrooms.map((room) => {
                            const active = draft.target_classroom_ids.includes(room.id);
                            return (
                              <button
                                type="button"
                                key={room.id}
                                onClick={() => toggleClassroom(room.id)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}
                              >
                                {room.name_ar}
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-xs font-bold text-muted-foreground">لا توجد فصول.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="display" className="mt-0">
          <div className="space-y-3 rounded-[1.75rem] border border-border/60 bg-card p-5 sm:p-7">
            <SettingRow
              title="استبانة إلزامية"
              description="لا يستطيع ولي الأمر تجاوزها قبل إرسال إجاباته."
              checked={draft.is_mandatory}
              onCheckedChange={(checked) =>
                update({
                  is_mandatory: checked,
                  allow_snooze: checked ? false : draft.allow_snooze,
                })
              }
            />
            <SettingRow
              title="السماح بالتأجيل"
              description="يظهر لولي الأمر زر التذكير لاحقًا وفق المدة المحددة."
              checked={draft.allow_snooze && !draft.is_mandatory}
              disabled={draft.is_mandatory}
              onCheckedChange={(checked) => update({ allow_snooze: checked })}
            />
            <div className="flex flex-col gap-2 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-foreground">مدة التأجيل</p>
                <p className="text-xs text-muted-foreground">
                  متى تعود الاستبانة للظهور بعد التأجيل؟
                </p>
              </div>
              <Select
                disabled={draft.is_mandatory || !draft.allow_snooze}
                value={String(draft.snooze_duration_hours)}
                onValueChange={(value) => update({ snooze_duration_hours: Number(value) })}
              >
                <SelectTrigger className="w-full rounded-xl sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SNOOZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="questions" className="mt-0 space-y-4">
          {draft.questions.map((question, index) => (
            <QuestionCard
              key={question.id ?? index}
              question={question}
              index={index}
              total={draft.questions.length}
              onChange={(patch) => updateQuestion(index, patch)}
              onMove={move}
              onRemove={() => remove(index)}
            />
          ))}
          <Button
            variant="outline"
            onClick={addQuestion}
            className="w-full rounded-2xl border-dashed py-6 font-black"
          >
            <Plus className="size-4" /> إضافة سؤال
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div>
        <p className="text-sm font-black text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  question: QuestionDraft;
  index: number;
  total: number;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const isChoice =
    question.question_type === "single_choice" || question.question_type === "multiple_choice";
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-2 hidden text-muted-foreground sm:block">
          <GripVertical className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              السؤال {index + 1}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
                title="تحريك لأعلى"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                disabled={index === total - 1}
                onClick={() => onMove(index, 1)}
                title="تحريك لأسفل"
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-destructive hover:text-destructive"
                onClick={onRemove}
                title="حذف السؤال"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <Input
            maxLength={400}
            value={question.question_text}
            onChange={(e) => onChange({ question_text: e.target.value })}
            placeholder="اكتب السؤال هنا..."
            className="h-12 rounded-2xl"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <Select
              value={question.question_type}
              onValueChange={(value) =>
                onChange({
                  question_type: value as QuestionType,
                  options:
                    value === "single_choice" || value === "multiple_choice"
                      ? question.options.length
                        ? question.options
                        : ["", ""]
                      : [],
                })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Switch
                checked={question.is_required}
                onCheckedChange={(checked) => onChange({ is_required: checked })}
              />{" "}
              إجابة مطلوبة
            </label>
          </div>
          {isChoice ? (
            <div className="mt-4 space-y-2 rounded-2xl bg-muted/30 p-3">
              {question.options.map((option, optionIndex) => (
                <div className="flex gap-2" key={optionIndex}>
                  <Input
                    maxLength={120}
                    value={option}
                    onChange={(e) =>
                      onChange({
                        options: question.options.map((item, i) =>
                          i === optionIndex ? e.target.value : item,
                        ),
                      })
                    }
                    placeholder={`الخيار ${optionIndex + 1}`}
                    className="h-10 rounded-xl bg-background"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 rounded-xl text-destructive"
                    disabled={question.options.length <= 2}
                    onClick={() =>
                      onChange({ options: question.options.filter((_, i) => i !== optionIndex) })
                    }
                    title="حذف الخيار"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ options: [...question.options, ""] })}
                className="rounded-xl font-bold"
              >
                <Plus className="size-4" /> إضافة خيار
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  surveys,
  selectedId,
  onSelect,
}: {
  surveys: SurveyWithQuestions[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [results, setResults] = useState<Awaited<ReturnType<typeof loadSurveyResults>> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const exportRef = useRef<HTMLDivElement>(null);
  const survey = surveys.find((item) => item.id === selectedId) ?? surveys[0];

  async function load() {
    if (!survey) return;
    setLoading(true);
    try {
      setResults(await loadSurveyResults(survey.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل التحليلات");
    } finally {
      setLoading(false);
    }
  }
  const filteredResponseIds = useMemo(
    () =>
      new Set(
        (results?.responses ?? [])
          .filter(
            (response) =>
              (!from || response.submitted_at >= new Date(from).toISOString()) &&
              (!to || response.submitted_at <= new Date(`${to}T23:59:59`).toISOString()),
          )
          .map((response) => response.id),
      ),
    [results, from, to],
  );
  const responseCount = filteredResponseIds.size;
  const answerRows = (questionId: string) =>
    (results?.answers ?? []).filter(
      (answer) => answer.question_id === questionId && filteredResponseIds.has(answer.response_id),
    );
  const chartData = (question: SurveyWithQuestions["questions"][number]) => {
    const answers = answerRows(question.id);
    if (question.question_type === "rating_stars" || question.question_type === "likert_scale")
      return [1, 2, 3, 4, 5].map((value) => ({
        name: String(value),
        value: answers.filter((answer) => answer.answer_numeric === value).length,
      }));
    const values = question.options.map((option) => ({
      name: option.option_text,
      value: answers.filter((answer) => answer.answer_text === option.option_text).length,
    }));
    return values.length
      ? values
      : [{ name: "إجابات نصية", value: answers.filter((answer) => answer.answer_text).length }];
  };
  async function exportPdf() {
    if (!exportRef.current || !survey) return;
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const data = await toPng(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("تعذر تجهيز التقرير"));
        img.src = data;
      });
      const margin = 24;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      const height = (image.height / image.width) * width;
      pdf.addImage(data, "PNG", margin, margin, width, height);
      pdf.save(`تقرير-${survey.title.slice(0, 40)}.pdf`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تصدير التقرير");
    }
  }
  function exportRaw() {
    if (!survey || !results) return;
    const rows = results.responses
      .filter((r) => filteredResponseIds.has(r.id))
      .flatMap((response) =>
        survey.questions.map((question) => {
          const values = results.answers
            .filter((a) => a.response_id === response.id && a.question_id === question.id)
            .map((a) => a.answer_text ?? a.answer_numeric ?? "");
          return {
            date: new Date(response.submitted_at).toLocaleString("ar-SA"),
            parent: results.parents[response.parent_id] ?? "ولي أمر",
            question: question.question_text,
            answer: values.join("، "),
          };
        }),
      );
    exportExcel(
      "survey-responses",
      `استجابات ${survey.title}`,
      [
        { key: "date", label: "التاريخ" },
        { key: "parent", label: "ولي الأمر" },
        { key: "question", label: "السؤال" },
        { key: "answer", label: "الإجابة" },
      ],
      rows,
    );
  }

  if (!surveys.length)
    return (
      <div className="rounded-[1.75rem] border border-border/60 bg-card p-10 text-center text-sm font-bold text-muted-foreground">
        لا توجد استبانات لعرض تحليلاتها.
      </div>
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.75rem] border border-border/60 bg-card p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <Label className="font-black">اختر الاستبانة</Label>
          <Select
            value={survey.id}
            onValueChange={(id) => {
              onSelect(id);
              setResults(null);
            }}
          >
            <SelectTrigger className="mt-2 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {surveys.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={loading} className="rounded-xl font-black">
          <BarChart3 className="size-4" /> {loading ? "جار التحميل..." : "تحديث التحليل"}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
        <div>
          <Label className="text-xs font-black">من تاريخ</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
        <div>
          <Label className="text-xs font-black">إلى تاريخ</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
        <div className="ms-auto flex gap-2">
          <Button
            variant="outline"
            onClick={exportRaw}
            disabled={!results}
            className="rounded-xl font-bold"
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportPdf}
            disabled={!results}
            className="rounded-xl font-bold"
          >
            <Download className="size-4" /> PDF
          </Button>
        </div>
      </div>
      {results ? (
        <div ref={exportRef} className="space-y-5 bg-background p-1">
          <ReportLetterhead
            documentTitle="تقرير تحليلات الاستبانة"
            badge="استبيانات وآراء"
            subtitle={survey.title}
            meta={[
              `عدد الاستجابات: ${responseCount}`,
              from ? `من ${new Date(from).toLocaleDateString("ar-SA")}` : null,
              to ? `إلى ${new Date(to).toLocaleDateString("ar-SA")}` : null,
            ]}
          />{" "}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="إجمالي الاستجابات" value={responseCount} />
            <Metric label="الأسئلة" value={survey.questions.length} />
            <Metric label="نسبة الإكمال" value={responseCount ? "100%" : "—"} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {survey.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-[1.5rem] border border-border/60 bg-card p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                    <BarChart3 className="size-4" />
                  </span>
                  <h3 className="text-sm font-black text-foreground">{question.question_text}</h3>
                </div>
                {question.question_type === "text" ? (
                  <p className="text-xs font-bold text-muted-foreground">
                    {answerRows(question.id).length} إجابات نصية مستلمة
                  </p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      {question.question_type === "rating_stars" ||
                      question.question_type === "likert_scale" ? (
                        <BarChart data={chartData(question)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData(question)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            label
                          >
                            {chartData(question).map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 bg-card p-12 text-center text-sm font-bold text-muted-foreground">
          اضغط «تحديث التحليل» لعرض النتائج والرسوم البيانية.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black text-primary">{value}</p>
    </div>
  );
}
