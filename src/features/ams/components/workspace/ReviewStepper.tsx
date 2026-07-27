import { Check, ClipboardCheck, FileSearch, Gavel, Inbox, Ticket, UserCog } from "lucide-react";

import { cn } from "@/lib/utils";
import { overallCompletion } from "../../recommendations";
import type { WorkspaceData } from "../../types";

const STEPS = [
  { key: "received", label: "استلام الطلب", icon: Inbox },
  { key: "assigned", label: "الفرز والإسناد", icon: UserCog },
  { key: "review", label: "مراجعة البيانات والمستندات", icon: FileSearch },
  { key: "recommend", label: "توصية مسؤول التسجيل", icon: ClipboardCheck },
  { key: "decision", label: "قرار مدير المدرسة", icon: Gavel },
  { key: "seat", label: "المقعد والسداد", icon: Ticket },
] as const;

function currentIndex(data: WorkspaceData) {
  const status = data.application.status;
  if (["approved", "rejected"].includes(status)) {
    return data.application.seat_status === "reserved" && data.application.payment_status === "paid" ? 6 : 5;
  }
  if (status === "principal_review") return 4;
  if (data.application.officer_recommendation) return 3;
  if (status === "under_review" || status === "needs_action") return 2;
  if (data.application.assigned_officer_id) return 1;
  return 0;
}

/** Wizard-style progress bar telling the reviewer exactly where the file stands. */
export function ReviewStepper({ data }: { data: WorkspaceData }) {
  const active = currentIndex(data);
  const completion = overallCompletion(data);

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-foreground">مسار المراجعة</p>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold text-primary">
          اكتمال الملف {completion}%
        </span>
      </div>
      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {STEPS.map((step, index) => {
          const done = index < active;
          const current = index === active;
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition",
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
                {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold text-muted-foreground">
                  الخطوة {index + 1}
                </span>
                <span className="block truncate text-[11px] font-extrabold text-foreground">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}