import { Check, CircleDot, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { WorkspaceData } from "../../types";

type StepState = "done" | "current" | "todo" | "blocked";

const STEPS = [
  { key: "received", label: "استلام الطلب", hint: "وصل الطلب من ولي الأمر وسُجّل في النظام." },
  { key: "review", label: "مراجعة الموظف", hint: "فحص البيانات والمستندات وطلب أي تصحيح." },
  { key: "seat", label: "المقعد وقائمة الانتظار", hint: "تخصيص فصل مطابق للعمر أو إدراج على الانتظار." },
  { key: "principal", label: "اعتماد المدير", hint: "الطلب لدى مدير المدرسة للقرار." },
  { key: "decision", label: "القرار النهائي", hint: "قبول أو رفض مع إشعار ولي الأمر." },
] as const;

/**
 * Shows exactly where the application stands in the official workflow and
 * which action unlocks the next step.
 */
export function WorkflowProgress({ data }: { data: WorkspaceData }) {
  const status = data.application.status as string;
  const seatStatus = data.application.seat_status as string;
  const decided = ["approved", "rejected", "withdrawn"].includes(status);
  const raised = status === "principal_review";
  const reviewStarted = !["draft", "submitted"].includes(status);
  const seatDone = ["reserved", "held", "waitlisted"].includes(seatStatus) || Boolean(data.application.classroom_id);
  const openRequests = data.documentRequests.filter((request) => !request.fulfilled_at).length;
  const openCorrections =
    status === "needs_action" || (data.application.correction_sections ?? []).length > 0;

  const currentIndex = decided ? 4 : raised ? 3 : reviewStarted ? (seatDone ? 3 : 2) : 1;

  const stateOf = (index: number): StepState => {
    if (decided) return index <= 4 ? "done" : "todo";
    if (index < currentIndex) return "done";
    if (index === currentIndex) return "current";
    return "todo";
  };

  const nextAction = decided
    ? "اكتمل مسار الطلب — لا توجد خطوات متبقية."
    : !reviewStarted
      ? "الخطوة التالية: الضغط على «بدء المراجعة» لإسناد الطلب وفتح بقية الإجراءات."
      : openRequests > 0 || openCorrections
        ? `الخطوة التالية: انتظار ولي الأمر لإغلاق ${openRequests > 0 ? `${openRequests} طلب مستندات` : ""}${openRequests > 0 && openCorrections ? " و" : ""}${openCorrections ? "طلب التعديل" : ""}.`
        : raised
          ? "الخطوة التالية: قرار مدير المدرسة (قبول / رفض / طلب معلومات إضافية)."
          : !seatDone
            ? "الخطوة التالية: تخصيص مقعد مطابق للعمر أو نقل الطلب لقائمة الانتظار."
            : "الخطوة التالية: رفع الطلب لاعتماد مدير المدرسة.";

  const percent = Math.round(((currentIndex + (decided ? 1 : 0)) / STEPS.length) * 100);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-foreground">مؤشر تقدم الطلب</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
          {percent}%
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-3 space-y-2">
        {STEPS.map((step, index) => {
          const state = stateOf(index);
          return (
            <li key={step.key} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold",
                  state === "done" && "bg-mint text-foreground",
                  state === "current" && "bg-primary text-primary-foreground",
                  state === "todo" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : state === "current" ? (
                  <CircleDot className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[12px] font-extrabold",
                    state === "todo" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {index + 1}. {step.label}
                  {state === "current" ? (
                    <span className="ms-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                      الآن
                    </span>
                  ) : null}
                </p>
                <p className="text-[10px] font-bold leading-4 text-muted-foreground">{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-2xl border border-gold/50 bg-gold/12 px-3 py-2 text-[11px] font-bold leading-5 text-foreground">
        {nextAction}
      </p>
    </div>
  );
}