import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Info,
  ListOrdered,
  Loader2,
  MessageCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { amsNotifySeatAvailable, amsSeatAssign, amsWaitingList } from "@/features/ams/ams.functions";
import { Button } from "@/components/ui/button";
import { openWhatsapp } from "@/lib/whatsapp";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { EmptyState, SkeletonRows, formatDateTime } from "@/features/ams/components/atoms";
import {
  WAITLIST_REASONS,
  evaluatePreferences,
  type PreferenceVerdict,
} from "@/features/ams/waitlist-reasons";
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
  ok: "border-mint bg-mint/30 text-foreground",
  warn: "border-gold/50 bg-gold/15 text-foreground",
  muted: "border-border/60 bg-muted/30 text-muted-foreground",
} as const;

type Row = {
  key: string;
  childId: string | null;
  childName: string;
  applicationId: string;
  applicationNumber: string | null;
  parentName: string | null;
  parentPhone: string | null;
  months: number | null;
  createdAt: string | null;
  position: number | null;
  queueRoomName: string | null;
  queueRoomId: string | null;
  verdicts: PreferenceVerdict[];
  note: string | null;
};

function WaitingListPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ams", "waiting-list"],
    queryFn: () => amsWaitingList(),
    // Live watch: a freed seat should surface a placement button within seconds.
    refetchInterval: 15_000,
  });
  const classrooms = data?.classrooms ?? [];

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const queued: Row[] = (data.entries ?? []).map((entry, index) => {
      const child = entry.applications?.application_children?.[0] ?? null;
      const months = ageInMonths(child?.birth_date ?? null);
      return {
        key: entry.id,
        childId: child?.id ?? null,
        childName: child?.name_ar ?? "بدون اسم",
        applicationId: entry.application_id,
        applicationNumber: entry.applications?.application_number ?? null,
        parentName: null,
        parentPhone: null,
        months,
        createdAt: entry.created_at,
        position: entry.position || index + 1,
        queueRoomName: entry.classrooms?.name_ar ?? null,
        queueRoomId: entry.classrooms?.id ?? null,
        verdicts: evaluatePreferences(
          [
            child?.preference_1_classroom_id ?? null,
            child?.preference_2_classroom_id ?? null,
            child?.preference_3_classroom_id ?? null,
          ],
          classrooms,
          months,
        ),
        note: entry.note ?? null,
      };
    });

    const blocked: Row[] = (data.blocked ?? [])
      .map((row) => {
        const months = ageInMonths(row.birthDate);
        return {
          key: row.childId,
          childId: row.childId,
          childName: row.childName,
          applicationId: row.applicationId,
          applicationNumber: row.applicationNumber,
          parentName: row.parentName,
          parentPhone: row.parentPhone,
          months,
          createdAt: row.createdAt,
          position: null,
          queueRoomName: null,
          queueRoomId: null,
          verdicts: evaluatePreferences(row.preferences, classrooms, months),
          note: null,
        } satisfies Row;
      })
      .filter((row) => row.verdicts.some((v) => v.classroom));

    return [...queued, ...blocked];
  }, [data, classrooms]);

  const openings = rows.filter((row) => row.verdicts.some((v) => v.admissible)).length;

  /* Instant in-screen alerts: a new queue entry, or a seat that just freed. */
  const previous = useRef<{ count: number; openings: number } | null>(null);
  useEffect(() => {
    if (!data) return;
    const snapshot = { count: rows.length, openings };
    const before = previous.current;
    previous.current = snapshot;
    if (!before) return;
    if (snapshot.count > before.count) {
      toast.warning(`تمت إضافة ${snapshot.count - before.count} طلب إلى قائمة الانتظار`);
    }
    if (snapshot.openings > before.openings) {
      toast.success("توفّر مقعد في فصل عليه قائمة انتظار — يمكن التسكين الآن");
    }
  }, [data, rows.length, openings]);

  const place = useMutation({
    mutationFn: (input: { childId: string; classroomId: string }) => amsSeatAssign({ data: input }),
    onSuccess: () => {
      toast.success("تم تسكين الطفل في المقعد الشاغر");
      void queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const notifyParent = useMutation({
    mutationFn: (input: { applicationId: string; classroomId: string; childName: string }) =>
      amsNotifySeatAvailable({ data: input }),
    onSuccess: (res) => {
      if (res && "blocked" in res && res.blocked) toast.warning(res.message);
      else toast.success("تم إشعار ولي الأمر بتوفّر المقعد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AmsShell
      title="قائمة الانتظار"
      description="طابور واحد واضح لكل فصل — إجراء مباشر بدلًا من الشرح، وإشعار يذهب لصاحب الأسبقية فقط"
      wide
      actions={<LegendToggle />}
    >
      {error ? (
        <EmptyState title="تعذّر التحميل" description={(error as Error).message} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="size-5" />}
          title="قائمة الانتظار فارغة"
          description="لا توجد طلبات بانتظار مقاعد حاليًا."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat icon={<Users className="size-4" />} label="على قائمة الانتظار" value={rows.length} />
            <Stat
              icon={<CheckCircle2 className="size-4" />}
              label="جاهز للتسكين الفوري"
              value={openings}
              tone={openings ? "ok" : "muted"}
            />
            <Stat
              icon={<ListOrdered className="size-4" />}
              label="فصول عليها انتظار"
              value={new Set(rows.map((r) => r.queueRoomId ?? "—")).size}
            />
          </div>

          <ReasonLegend />

          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,2.6fr)_minmax(0,1.6fr)] gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-[10px] font-extrabold text-muted-foreground lg:grid">
              <span>الطالب</span>
              <span>الرغبات وحالتها</span>
              <span className="text-end">الإجراءات</span>
            </div>
            <ul className="divide-y divide-border/50">
              {rows.map((row) => {
                const openSeat = row.verdicts.find((v) => v.admissible && v.classroom);
                const isFirst = row.position === null || row.position <= 1;
                return (
                  <li
                    key={row.key}
                    className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,2.6fr)_minmax(0,1.6fr)] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {row.position ? (
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                            {row.position}
                          </span>
                        ) : null}
                        <Link
                          to="/ams/applications/$applicationId"
                          params={{ applicationId: row.applicationId }}
                          className="truncate text-sm font-black text-foreground hover:text-primary"
                        >
                          {row.childName}
                        </Link>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] font-bold text-muted-foreground">
                        {row.applicationNumber ?? "بدون رقم"} · {row.months !== null ? formatAge(row.months) : "عمر غير مسجّل"}
                        {row.queueRoomName ? ` · انتظار ${row.queueRoomName}` : " · جميع الرغبات مكتملة"}
                        {row.createdAt ? ` · ${formatDateTime(row.createdAt)}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {row.verdicts.map((verdict) => {
                        const reason = WAITLIST_REASONS[verdict.code];
                        return (
                          <span
                            key={`${row.key}-${verdict.index}`}
                            title={`${reason.label} — ${reason.detail}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold",
                              TONE_CLASS[reason.tone],
                            )}
                          >
                            <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[9px]" dir="ltr">
                              {verdict.code}
                            </span>
                            {verdict.index + 1}. {verdict.classroom?.name_ar ?? "غير محددة"}
                            {verdict.classroom ? (
                              <span className="text-muted-foreground" dir="ltr">
                                {verdict.free}/{verdict.classroom.capacity}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                      {openSeat?.classroom && row.childId ? (
                        <Button
                          variant="hero"
                          size="sm"
                          className="rounded-2xl text-[11px] font-extrabold"
                          disabled={place.isPending}
                          title={`تسكين في ${openSeat.classroom.name_ar}`}
                          onClick={() =>
                            place.mutate({ childId: row.childId!, classroomId: openSeat.classroom!.id })
                          }
                        >
                          {place.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}
                          تسكين
                        </Button>
                      ) : null}
                      <Button
                        variant="soft"
                        size="sm"
                        className="rounded-2xl text-[11px] font-extrabold"
                        disabled={notifyParent.isPending || !openSeat?.classroom || !isFirst}
                        title={
                          !openSeat?.classroom
                            ? "لا يوجد مقعد شاغر ضمن الرغبات"
                            : !isFirst
                              ? "الإشعار يذهب لصاحب الأسبقية في القائمة فقط"
                              : "إشعار ولي الأمر بتوفّر المقعد"
                        }
                        onClick={() =>
                          notifyParent.mutate({
                            applicationId: row.applicationId,
                            classroomId: openSeat!.classroom!.id,
                            childName: row.childName,
                          })
                        }
                      >
                        <BellRing className="size-3.5" />
                        إشعار
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-2xl text-[11px] font-extrabold"
                        disabled={!row.parentPhone}
                        title={row.parentPhone ? "مراسلة ولي الأمر" : "رقم ولي الأمر غير متوفر"}
                        onClick={() =>
                          openWhatsapp(
                            row.parentPhone,
                            `السلام عليكم ${row.parentName ?? ""}، بخصوص طلب ${row.applicationNumber ?? ""} للطفل ${row.childName}: ${
                              openSeat?.classroom
                                ? `تم توفّر مقعد شاغر في فصل ${openSeat.classroom.name_ar}، يرجى التواصل معنا لتأكيد التسكين.`
                                : "طلبكم على قائمة الانتظار وسنوافيكم فور توفّر مقعد."
                            }`,
                          )
                        }
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
                      <Link
                        to="/ams/applications/$applicationId"
                        params={{ applicationId: row.applicationId }}
                        className="grid size-8 place-items-center rounded-2xl border border-border/60 text-muted-foreground hover:text-primary"
                        title="فتح الملف"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>

                    {row.note ? (
                      <p className="text-[10px] font-bold text-muted-foreground lg:col-span-3">
                        ملاحظة الموظف: {row.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </AmsShell>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "ok" | "muted";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border px-4 py-3",
        tone === "ok" ? "border-mint bg-mint/25" : "border-border/60 bg-card",
      )}
    >
      <span className="grid size-9 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
      <div>
        <p className="text-lg font-black text-foreground">{value}</p>
        <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/** Compact, collapsed-by-default codes reference (was a long text block). */
function ReasonLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
      >
        <span className="flex items-center gap-2 text-[11px] font-extrabold text-foreground">
          <Info className="size-4 text-primary" /> دليل أكواد الأسباب
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="grid gap-1.5 border-t border-border/50 p-3 sm:grid-cols-2 xl:grid-cols-3">
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
      ) : null}
    </div>
  );
}

function LegendToggle() {
  return (
    <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[10px] font-extrabold text-muted-foreground">
      الإشعار يذهب لصاحب الأسبقية فقط
    </span>
  );
}
