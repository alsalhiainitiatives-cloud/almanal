import { useEffect, useState } from "react";
import { Check, ChevronLeft, CircleHelp, Clock3, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  LIKERT_LABELS,
  missingRequired,
  nextSurveyForParent,
  snoozeSurvey,
  submitSurvey,
  type AnswerValue,
  type PendingSurvey,
  type SurveyQuestion,
} from "../surveys";

export function ParentSurveyPrompt() {
  const { user, roles, initializing, loadingContext } = useAuth();
  const [pending, setPending] = useState<PendingSurvey | null>(null);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initializing || loadingContext || !user || !roles.includes("parent")) return;
    let mounted = true;
    nextSurveyForParent(user.id)
      .then((result) => { if (mounted) setPending(result); })
      .catch(() => { /* A survey must never block the parent portal when data is unavailable. */ });
    return () => { mounted = false; };
  }, [initializing, loadingContext, roles, user]);

  function setValue(questionId: string, value: AnswerValue) {
    setValues((current) => ({ ...current, [questionId]: value }));
  }

  async function handleSnooze() {
    if (!pending || !user || !pending.survey.allow_snooze || pending.mustAnswer) return;
    setLoading(true);
    try {
      await snoozeSurvey(user.id, pending.survey);
      setPending(null);
      toast.success("سنذكّرك بالاستبانة لاحقًا");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تأجيل الاستبانة");
    } finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (!pending || !user) return;
    const missing = missingRequired(pending.survey, values);
    if (missing.length) { toast.error("أكمل الإجابات المطلوبة قبل الإرسال"); return; }
    setSubmitting(true);
    try {
      await submitSurvey(user.id, pending.survey, values);
      setPending(null);
      toast.success("شكرًا لك، تم إرسال رأيك بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الاستبانة");
    } finally { setSubmitting(false); }
  }

  return <Dialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && pending?.mustAnswer) return; if (!open) setPending(null); }}>
    <DialogContent dir="rtl" className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[2rem] border-border/60 p-0 text-right">
      {pending ? <>
        <div className="bg-primary/10 px-6 pb-5 pt-7 sm:px-8"><DialogHeader className="text-right"><div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><CircleHelp className="size-6" /></span><div><DialogTitle className="text-xl font-black text-foreground">{pending.survey.title}</DialogTitle><DialogDescription className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">{pending.survey.description || "يسعدنا أن نسمع رأيك لتحسين تجربة أطفالنا في المدرسة."}</DialogDescription></div></div></DialogHeader><div className="mt-5 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-background/80 px-3 py-1 text-primary">{pending.survey.questions.length} أسئلة</span>{pending.mustAnswer ? <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">استبانة مطلوبة</span> : <span className="rounded-full bg-gold/30 px-3 py-1 text-foreground">رأيك يهمنا</span>}</div></div>
        <div className="space-y-4 px-6 py-6 sm:px-8">{pending.survey.questions.map((question, index) => <ParentQuestion key={question.id} question={question} number={index + 1} value={values[question.id]} onChange={(value) => setValue(question.id, value)} />)}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div>{!pending.mustAnswer && pending.survey.allow_snooze ? <Button variant="ghost" disabled={loading || submitting} onClick={handleSnooze} className="rounded-xl font-bold text-muted-foreground"><Clock3 className="size-4" /> تذكيري لاحقًا</Button> : <p className="text-xs font-semibold text-muted-foreground">أكمل الإجابات المطلوبة للوصول إلى البوابة.</p>}</div><Button disabled={loading || submitting} onClick={handleSubmit} className="rounded-xl px-6 font-black">{submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} إرسال الإجابات</Button></div>
      </> : null}
    </DialogContent>
  </Dialog>;
}

function ParentQuestion({ question, number, value, onChange }: { question: SurveyQuestion; number: number; value: AnswerValue | undefined; onChange: (value: AnswerValue) => void }) {
  const choice = (selected: string) => onChange({ text: selected });
  return <fieldset className="rounded-[1.5rem] border border-border/60 bg-card p-4 sm:p-5"><legend className="px-2 text-sm font-black text-foreground">{number}. {question.question_text} {question.is_required ? <span className="text-destructive">*</span> : null}</legend>{question.question_type === "text" ? <Textarea maxLength={2000} value={value?.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="اكتب إجابتك هنا..." className="mt-3 min-h-24 rounded-2xl" /> : null}{question.question_type === "single_choice" ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <button type="button" key={option.id} onClick={() => choice(option.option_text)} className={`flex items-center gap-3 rounded-xl border p-3 text-start text-sm font-bold transition ${value?.text === option.option_text ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}><span className={`grid size-5 place-items-center rounded-full border ${value?.text === option.option_text ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{value?.text === option.option_text ? <Check className="size-3" /> : null}</span>{option.option_text}</button>)}</div> : null}{question.question_type === "multiple_choice" ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option) => { const selected = value?.choices?.includes(option.option_text) ?? false; return <button type="button" key={option.id} onClick={() => onChange({ choices: selected ? (value?.choices ?? []).filter((item) => item !== option.option_text) : [...(value?.choices ?? []), option.option_text] })} className={`flex items-center gap-3 rounded-xl border p-3 text-start text-sm font-bold transition ${selected ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}><span className={`grid size-5 place-items-center rounded-md border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected ? <Check className="size-3" /> : null}</span>{option.option_text}</button>; })}</div> : null}{question.question_type === "rating_stars" ? <div className="mt-3 flex flex-row-reverse justify-end gap-2">{[5, 4, 3, 2, 1].map((star) => <button type="button" key={star} aria-label={`${star} نجوم`} onClick={() => onChange({ numeric: star })} className={`rounded-xl p-2 transition hover:bg-gold/20 ${value?.numeric && value.numeric >= star ? "text-gold" : "text-muted-foreground/40"}`}><Star className="size-8 fill-current" /></button>)}</div> : null}{question.question_type === "likert_scale" ? <div className="mt-3 grid grid-cols-5 gap-1">{LIKERT_LABELS.map((label, index) => { const score = index + 1; return <button type="button" key={label} onClick={() => onChange({ numeric: score })} className={`rounded-xl border p-2 text-center text-[10px] font-bold sm:text-xs ${value?.numeric === score ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}><span className="block text-base font-black">{score}</span>{label}</button>; })}</div> : null}</fieldset>;
}
