import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { amsActivity } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows, formatDateTime } from "@/features/ams/components/atoms";
import { useAmsRealtime } from "@/features/ams/useAmsRealtime";

export const Route = createFileRoute("/_authenticated/ams/activity")({
  head: () => ({
    meta: [
      { title: "الحركة اللحظية — مدارس وروضة المنال" },
      { name: "description", content: "سجل لحظي لكل إجراء يتم على طلبات القبول." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "اليوم";
  if (same(date, yesterday)) return "أمس";
  return date.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
}

function ActivityPage() {
  useAmsRealtime();
  const { data, isLoading, error } = useQuery({ queryKey: ["ams", "activity"], queryFn: () => amsActivity() });
  const [term, setTerm] = useState("");

  const groups = useMemo(() => {
    const q = term.trim();
    const rows = (data ?? []).filter((event) =>
      q ? `${event.title_ar} ${event.body_ar ?? ""} ${event.actorName ?? ""}`.includes(q) : true,
    );
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = dayLabel(row.created_at);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()];
  }, [data, term]);

  return (
    <AmsShell title="الحركة اللحظية" description="كل إجراء يُنفَّذ على الطلبات مرتبًا زمنيًا">
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <div className="space-y-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="ابحث في السجل…"
              className="w-full rounded-2xl border border-border/60 bg-card py-2.5 pe-4 ps-10 text-xs font-bold outline-none focus:border-primary"
            />
          </div>

          {groups.length === 0 ? (
            <EmptyState title="لا توجد أحداث" description="لم يُسجَّل أي إجراء مطابق حتى الآن." />
          ) : (
            groups.map(([day, events]) => (
              <section key={day} className="rounded-3xl border border-border/60 bg-card p-5">
                <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
                  <Activity className="size-4 text-primary" /> {day}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{events.length}</span>
                </h2>
                <ol className="mt-3 space-y-3 border-s border-border/60 ps-4">
                  {events.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                      <Link
                        to="/ams/applications/$applicationId"
                        params={{ applicationId: event.application_id }}
                        className="group block rounded-2xl px-2 py-1 transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs font-extrabold text-foreground group-hover:text-primary">{event.title_ar}</p>
                        {event.body_ar ? (
                          <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{event.body_ar}</p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] font-bold text-muted-foreground/80">
                          {event.actorName} · {formatDateTime(event.created_at)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))
          )}
        </div>
      )}
    </AmsShell>
  );
}
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/ams/activity')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/ams/activity"!</div>
}
