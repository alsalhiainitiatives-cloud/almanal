import { Check, CircleDot, FileSearch, Gavel, Inbox, Lock, Ticket, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { overallCompletion } from "../../recommendations";
import type { WorkspaceData } from "../../types";

const STEPS = [
  { key: "received", label: "استلام الطلب", icon: Inbox, hint: "وصل الطلب من ولي الأمر وسُجّل في النظام." },
  { key: "review", label: "مراجعة الموظف", icon: FileSearch, hint: "فحص البيانات والمستندات وطلب أي تصحيح." },
  { key: "seat", label: "المقعد وقائمة الانتظار", icon: Ticket, hint: "تخصيص فصل مطابق للعمر أو إدراج على الانتظار." },
  { key: "principal", label: "اعتماد المدير", icon: Gavel, hint: "الطلب لدى مدير المدرسة للقرار." },
  { key: "decision", label: "القرار النهائي", icon: Trophy, hint: "قبول أو رفض مع إشعار ولي الأمر." },
] as const;

/** Wizard-style progress bar telling the reviewer exactly where the file stands. */
export function ReviewStepper({ data }: { data: WorkspaceData }) {
  const completion = overallCompletion(data);

  const status = data.application.status as string;
  const seatStatus = data.application.seat_status as string;
  const decided = ["approved", "rejected", "withdrawn"].includes(status);
  const raised = status === "principal_review";
  const reviewStarted = !["draft", "submitted"].includes(status);
  const seatDone =
    ["reserved", "held", "waitlisted"].includes(seatStatus) || Boolean(data.application.classroom_id);
  const openRequests = data.documentRequests.filter((request) => !request.fulfilled_at).length;
  const openCorrections =
    status === "needs_action" || (data.application.correction_sections ?? []).length > 0;

  const active = decided ? 4 : raised ? 3 : reviewStarted ? (seatDone ? 3 : 2) : 1;

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

  const percent = Math.round(((active + (decided ? 1 : 0)) / STEPS.length) * 100);

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-foreground">مسار المراجعة</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">
            تقدم المسار {percent}%
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-extrabold text-muted-foreground">
            اكتمال الملف {completion}%
          </span>
        </div>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {STEPS.map((step, index) => {
          const done = decided ? true : index < active;
          const current = !decided && index === active;
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-start gap-2 rounded-2xl border px-3 py-2.5 transition",
                done
                  ? "border-mint bg-mint/30"
                  : current
                    ? "border-primary/50 bg-primary/8 shadow-sm"
                    : "border-border/60 bg-muted/20 opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-xl",
                  done
                    ? "bg-mint text-foreground"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : current ? (
                  <CircleDot className="size-3.5" />
                ) : (
                  <Lock className="size-3.5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold text-muted-foreground">
                  الخطوة {index + 1}
                  {current ? " · الآن" : ""}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-foreground">
                  <Icon className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{step.label}</span>
                </span>
                <span className="mt-0.5 block text-[10px] font-bold leading-4 text-muted-foreground">
                  {step.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-2xl border border-gold/50 bg-gold/12 px-3 py-2 text-[11px] font-bold leading-5 text-foreground">
        {nextAction}
      </p>
    </section>
  );
}