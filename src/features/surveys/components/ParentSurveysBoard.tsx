import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, CircleHelp, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  listParentSurveys,
  missingRequired,
  submitSurvey,
  type AnswerValue,
  type ParentSurveyItem,
} from "../surveys";
import { SurveyQuestionField } from "./SurveyQuestionField";

const dateFmt = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
    : "غير محدد";

/** Parent-facing list of the surveys addressed to them, with inline submission. */
export function ParentSurveysBoard() {
  const { user, initializing, loadingContext } = useAuth();
  const [items, setItems] = useState<ParentSurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await listParentSurveys(user.id));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "تعذر تحميل الاستبانات");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (initializing || loadingContext) return;
    void refresh();
  }, [initializing, loadingContext, refresh]);

  useEffect(() => {
    if (initializing || loadingContext || !user) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initializing, loadingContext, refresh, user]);

  async function handleSubmit(item: ParentSurveyItem) {
    if (!user) return;
    const missing = missingRequired(item.survey, values);
    if (missing.length) {
      toast.error("أكمل الإجابات المطلوبة قبل الإرسال");
      return;
    }
    setSubmitting(true);
    try {
      const { referenceCode } = await submitSurvey(user.id, item.survey, values);
      toast.success(
        referenceCode
          ? `تم إرسال إجابتك بنجاح — الرقم المرجعي ${referenceCode}`
          : "تم إرسال إجابتك بنجاح",
      );
      setOpenId(null);
      setValues({});
      await refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "تعذر إرسال الاستبانة");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center rounded-[1.75rem] border border-border/60 bg-card p-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <CircleHelp className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-black text-foreground">لا توجد استبانات متاحة حاليًا.</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          سنبلغك عند نشر استبانة جديدة تخصّ مرحلة أو فصل طفلك.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const open = openId === item.survey.id;
        const canAnswer = !item.completed && !item.expired;
        return (
          <article
            key={item.survey.id}
            className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-black text-foreground">{item.survey.title}</h2>
                {item.survey.description ? (
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
                    {item.survey.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-black">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                    <CalendarClock className="size-3.5" /> تاريخ الإغلاق:{" "}
                    {dateFmt(item.survey.end_date)}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {item.survey.questions.length} أسئلة
                  </span>
                  {item.survey.is_mandatory ? (
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
                      إلزامية
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${
                  item.expired
                    ? "bg-destructive/10 text-destructive"
                    : item.completed
                      ? "bg-gold/30 text-foreground"
                      : "bg-emerald-500/15 text-emerald-700"
                }`}
              >
                {item.expired ? "منتهي" : item.completed ? "تم الإرسال" : "متاح"}
              </span>
            </div>

            {item.completed ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-muted/40 p-3 text-xs font-bold text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                تم استلام إجابتك في {dateFmt(item.submittedAt)}
                {item.referenceCode ? (
                  <span className="rounded-full bg-background px-3 py-1 font-black text-primary">
                    الرقم المرجعي: {item.referenceCode}
                  </span>
                ) : null}
              </div>
            ) : null}

            {canAnswer ? (
              <div className="mt-4">
                {open ? (
                  <div className="space-y-4">
                    {item.survey.questions.map((question, index) => (
                      <SurveyQuestionField
                        key={question.id}
                        question={question}
                        number={index + 1}
                        value={values[question.id]}
                        onChange={(value) =>
                          setValues((current) => ({ ...current, [question.id]: value }))
                        }
                      />
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={submitting}
                        onClick={() => handleSubmit(item)}
                        className="rounded-xl px-6 font-black"
                      >
                        {submitting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}{" "}
                        إرسال الإجابات
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={submitting}
                        onClick={() => setOpenId(null)}
                        className="rounded-xl font-bold text-muted-foreground"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setOpenId(item.survey.id);
                      setValues({});
                    }}
                    className="rounded-xl px-5 font-black"
                  >
                    <Send className="size-4" /> ابدأ الاستبانة
                  </Button>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
