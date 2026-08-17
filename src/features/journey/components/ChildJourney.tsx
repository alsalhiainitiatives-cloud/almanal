import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { journeyParentView } from "../journey.functions";
import { EVIDENCE_KIND_LABELS, formatWeekRange } from "../journey";

export function ChildJourney() {
  const load = useServerFn(journeyParentView);
  const [childId, setChildId] = useState<string | null>(null);

  const journey = useQuery({ queryKey: ["child-journey"], queryFn: () => load() });
  const children = journey.data?.children ?? [];
  const activeId = childId && children.some((c) => c.id === childId) ? childId : (children[0]?.id ?? null);
  const active = children.find((c) => c.id === activeId) ?? null;

  const plans = useMemo(
    () => (journey.data?.plans ?? []).filter((p) => p.classroomId === active?.classroomId),
    [journey.data?.plans, active?.classroomId],
  );
  const skills = useMemo(
    () => (journey.data?.skills ?? []).filter((s) => s.childId === activeId),
    [journey.data?.skills, activeId],
  );

  if (journey.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-3xl border border-border/60 bg-card p-8 text-sm font-bold text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ تحميل يوميات طفلك…
      </div>
    );
  }

  if (!children.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">
          ستظهر يوميات طفلك هنا بعد اعتماد قبوله وتسكينه في الفصل.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {children.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChildId(c.id)}
            className={cn(
              "rounded-2xl border border-border/60 px-4 py-2.5 text-sm font-extrabold transition-colors",
              activeId === c.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c.name}
            {c.classroomName ? <span className="ms-2 text-[11px] font-bold opacity-80">{c.classroomName}</span> : null}
          </button>
        ))}
      </div>

      {active?.teacherName && (
        <p className="text-xs font-bold text-muted-foreground">
          معلمة الفصل: <span className="text-foreground">{active.teacherName}</span>
        </p>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
          <CalendarDays className="size-4 text-primary" /> الخطة الأسبوعية
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft">
              <p className="text-[11px] font-black text-primary">{formatWeekRange(p.weekStart)}</p>
              <h3 className="mt-1 text-base font-extrabold text-foreground">{p.title}</h3>
              {p.subject && <p className="text-xs font-bold text-muted-foreground">{p.subject}</p>}
              {p.lessons && (
                <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{p.lessons}</p>
              )}
              {p.activities && (
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-sky/30 p-3 text-xs leading-relaxed text-foreground">
                  الأنشطة: {p.activities}
                </p>
              )}
            </article>
          ))}
          {!plans.length && (
            <p className="rounded-[1.5rem] border border-dashed border-border/70 p-6 text-sm font-bold text-muted-foreground">
              لم تُنشر خطة أسبوعية لفصل طفلك بعد.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
          <Sparkles className="size-4 text-gold" /> مستكشف المهارات والإنجازات
        </h2>
        <ol className="space-y-3 border-s-2 border-dashed border-border/70 ps-4">
          {skills.map((s) => (
            <li key={s.id} className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-foreground">{s.skillName}</h3>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {s.domain ?? "—"} · {s.observedAt}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">نسبة الإكمال {s.completion}%</p>
                  <Progress value={s.completion} className="mt-1 h-2" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">نسبة التحسّن {s.improvement}%</p>
                  <Progress value={s.improvement} className="mt-1 h-2" />
                </div>
              </div>
              {s.note && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{s.note}</p>}

              {!!s.evidences.length && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {s.evidences.map((ev) =>
                    !ev.url ? null : ev.fileType === "image" ? (
                      <img
                        key={ev.id}
                        src={ev.url}
                        alt={`دليل إنجاز: ${s.skillName}`}
                        loading="lazy"
                        className="h-40 w-full rounded-2xl object-cover"
                      />
                    ) : ev.fileType === "video" ? (
                      <video key={ev.id} src={ev.url} controls className="h-40 w-full rounded-2xl bg-black/80" />
                    ) : (
                      <div key={ev.id} className="rounded-2xl bg-beige/60 p-3">
                        <p className="mb-2 text-[11px] font-bold text-foreground">
                          {EVIDENCE_KIND_LABELS[ev.fileType]}
                        </p>
                        <audio src={ev.url} controls className="w-full" />
                      </div>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
          {!skills.length && (
            <li className="rounded-[1.5rem] border border-dashed border-border/70 p-6 text-sm font-bold text-muted-foreground">
              لا توجد مهارات مرصودة لطفلك بعد — ستظهر هنا مع أدلتها الرقمية.
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}