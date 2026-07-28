import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ListOrdered } from "lucide-react";
import { amsWaitingList } from "@/features/ams/ams.functions";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows, formatDateTime } from "@/features/ams/components/atoms";
import { WAITLIST_REASONS, evaluatePreference, evaluatePreferences, waitlistSummary } from "@/features/ams/waitlist-reasons";
import { ageInMonths, formatAge } from "@/features/admissions/eligibility";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/_authenticated/ams/waiting-list")({
  head: () => ({
    meta: [
      { title: "قائمة الانتظار — مدارس وروضة المنال" },
      { name: "description", content: "ترتيب الطلبات على قوائم انتظار الفصول." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WaitingListPage,
});

const TONE_CLASS = {
  ok: "border-mint bg-mint/25",
  warn: "border-gold/50 bg-gold/12",
  muted: "border-border/60 bg-muted/25",
} as const;

function WaitingListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "waiting-list"],
    queryFn: () => amsWaitingList(),
  });
  const entries = data?.entries ?? [];
  const classrooms = data?.classrooms ?? [];
  return (
    <AmsShell
      title="قائمة الانتظار"
      description="الطلبات بانتظار توفّر مقعد، مع كود سبب واضح لكل رغبة يشرح القبول أو الانتظار"
    >
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="size-5" />}
          title="قائمة الانتظار فارغة"
          description="لا توجد طلبات بانتظار مقاعد حاليًا."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4">
            <p className="text-sm font-extrabold text-foreground">دليل أكواد الأسباب</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {Object.entries(WAITLIST_REASONS).map(([code, reason]) => (
                <div key={code} className={cn("rounded-2xl border px-3 py-2", TONE_CLASS[reason.tone])}>
                  <p className="flex items-center gap-2 text-[11px] font-extrabold text-foreground">
                    <span className="rounded-full bg-background/70 px-1.5 py-0.5" dir="ltr">
                      {code}
                    </span>
                    {reason.label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold leading-4 text-muted-foreground">{reason.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {entries.map((entry, index) => {
              const child = entry.applications?.application_children?.[0] ?? null;
              const months = ageInMonths(child?.birth_date ?? null);
              const target = evaluatePreference(0, entry.classrooms, months);
              const verdicts = evaluatePreferences(
                [
                  child?.preference_1_classroom_id ?? null,
                  child?.preference_2_classroom_id ?? null,
                  child?.preference_3_classroom_id ?? null,
                ],
                classrooms,
                months,
              );
              return (
                <article key={entry.id} className="rounded-3xl border border-border/60 bg-card p-4">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        to="/ams/applications/$applicationId"
                        params={{ applicationId: entry.application_id }}
                        className="text-sm font-extrabold text-foreground hover:text-primary"
                      >
                        {entry.applications?.application_number ?? "بدون رقم"}
                        {child ? ` — ${child.name_ar}` : ""}
                      </Link>
                      <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                        الترتيب {entry.position || index + 1} · الفصل {entry.classrooms?.name_ar ?? "—"} ·{" "}
                        {child ? `العمر ${formatAge(months)}` : "بدون بيانات عمر"} · {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-extrabold text-foreground",
                        TONE_CLASS[WAITLIST_REASONS[target.code].tone],
                      )}
                    >
                      <span dir="ltr">{target.code}</span> · {WAITLIST_REASONS[target.code].label}
                    </span>
                  </header>

                  <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                    {verdicts.map((verdict) => {
                      const reason = WAITLIST_REASONS[verdict.code];
                      return (
                        <div
                          key={`${entry.id}-${verdict.index}`}
                          className={cn("rounded-2xl border px-3 py-2", TONE_CLASS[reason.tone])}
                        >
                          <p className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-foreground">
                            <span>
                              الرغبة {verdict.index + 1}: {verdict.classroom?.name_ar ?? "غير محددة"}
                            </span>
                            <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[9px]" dir="ltr">
                              {verdict.code}
                            </span>
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold leading-4 text-muted-foreground">
                            {reason.label}
                            {verdict.classroom
                              ? ` · الشاغر ${verdict.free} من ${verdict.classroom.capacity} · النطاق ${verdict.classroom.min_age_months}–${verdict.classroom.max_age_months} شهرًا`
                              : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 rounded-2xl border border-border/60 bg-muted/25 px-3 py-2 text-[11px] font-bold leading-5 text-muted-foreground">
                    {waitlistSummary(verdicts, child?.name_ar ?? "الطفل")}
                  </p>
                  {entry.note ? (
                    <p className="mt-2 text-[10px] font-bold text-muted-foreground">ملاحظة الموظف: {entry.note}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </AmsShell>
  );
}