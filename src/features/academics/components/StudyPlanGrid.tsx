/**
 * Read-only weekly grid used by the printable/exported plan and by the parent
 * viewer, so both surfaces render exactly the same layout.
 */
import { Clock, StickyNote } from "lucide-react";

import { SCHOOL_DAYS, formatPlanRange, planTitle, type StudyPlan } from "../plans";

export function StudyPlanGrid({
  plan,
  schoolName = "مدارس وروضة المنال",
}: {
  plan: StudyPlan;
  schoolName?: string;
}) {
  return (
    <div dir="rtl" className="rounded-3xl border border-border/60 bg-card p-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <p className="text-[11px] font-black text-muted-foreground">{schoolName}</p>
          <h3 className="text-base font-black text-foreground">{planTitle(plan)}</h3>
          <p className="text-xs text-muted-foreground">
            {plan.classroomName ?? "الفصل"}
            {plan.stageName ? ` · ${plan.stageName}` : ""}
          </p>
        </div>
        <p className="text-xs font-bold text-muted-foreground">{formatPlanRange(plan)}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SCHOOL_DAYS.map((d) => {
          const items = plan.items.filter((i) => i.scheduledDay === d.day);
          return (
            <section key={d.day} className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <h4 className="mb-2 text-center text-xs font-black text-foreground">{d.label}</h4>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-muted-foreground">لا توجد دروس</p>
                ) : (
                  items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border-s-4 bg-card p-2 shadow-sm"
                      style={{ borderInlineStartColor: item.colorHex }}
                    >
                      <p className="text-xs font-black text-foreground">{item.lessonNameAr}</p>
                      {item.subjectNameAr ? (
                        <p className="text-[11px] text-muted-foreground">{item.subjectNameAr}</p>
                      ) : null}
                      {item.scheduledTime || item.durationMinutes ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {item.scheduledTime ?? "—"}
                          {item.durationMinutes ? ` · ${item.durationMinutes} د` : ""}
                        </p>
                      ) : null}
                      {item.notes ? (
                        <p className="mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-muted-foreground">
                          <StickyNote className="mt-0.5 size-3 shrink-0" />
                          {item.notes}
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {plan.notes ? (
        <p className="mt-4 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-foreground">
          {plan.notes}
        </p>
      ) : null}
    </div>
  );
}
