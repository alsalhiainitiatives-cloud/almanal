import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CalendarX2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publicRegistrationWindow } from "@/features/ams/season-public.functions";

/** "supplementary" → تسجيل إلحاقي */
export function seasonKindLabel(kind?: string | null) {
  return kind === "supplementary" ? "تسجيل إلحاقي (استثنائي)" : "تسجيل نظامي";
}

const AR_DATE = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatSeasonDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : AR_DATE.format(date);
}

function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return useMemo(() => {
    if (!target) return null;
    const end = new Date(target).getTime();
    if (Number.isNaN(end)) return null;
    const diff = Math.max(0, end - now);
    const seconds = Math.floor(diff / 1000);
    return {
      done: diff === 0,
      days: Math.floor(seconds / 86400),
      hours: Math.floor((seconds % 86400) / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
    };
  }, [target, now]);
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[4.25rem] rounded-2xl bg-primary-foreground/15 px-3 py-2 text-center backdrop-blur">
      <p className="text-2xl font-black tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[10px] font-bold opacity-80">{label}</p>
    </div>
  );
}

/**
 * Professional, always-visible registration announcement:
 * academic year, registration type, closing date and a live countdown.
 */
export function SeasonBanner({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery({
    queryKey: ["public-registration-window"],
    queryFn: () => publicRegistrationWindow(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const season = data?.season ?? null;
  const countdown = useCountdown(season?.endsAt ?? data?.next?.startsAt ?? null);
  if (!data) return null;

  if (!season) {
    return (
      <div className="rounded-[2rem] border-2 border-gold/50 bg-gold/15 p-6 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl gradient-burgundy text-primary-foreground">
          <CalendarX2 className="size-6" />
        </span>
        <h2 className="mt-4 text-xl font-black text-foreground">باب التسجيل مغلق حالياً</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-foreground/80">
          {data.next
            ? `يُفتح التسجيل للعام الدراسي ${data.next.academicYear} (${seasonKindLabel(
                data.next.kind,
              )}) بتاريخ ${formatSeasonDate(data.next.startsAt)}.`
            : data.closureMessage ||
              "نشكر لكم اهتمامكم بانضمام طفلكم لمجتمع المنال — تابعونا لإعلان موعد فتح التسجيل."}
        </p>
        {data.next && countdown ? (
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-foreground">
            <Unit value={countdown.days} label="يوم" />
            <Unit value={countdown.hours} label="ساعة" />
            <Unit value={countdown.minutes} label="دقيقة" />
            <Unit value={countdown.seconds} label="ثانية" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] gradient-burgundy p-6 text-primary-foreground shadow-soft sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-black">
            <Sparkles className="size-3.5" />
            {season.nameAr} · {seasonKindLabel(season.kind)}
          </span>
          <h2 className="text-2xl font-black leading-snug sm:text-3xl">
            التسجيل مفتوح الآن للعام الدراسي {season.academicYear}
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold opacity-90">
            <CalendarClock className="size-4" />
            من {formatSeasonDate(season.startsAt)} حتى {formatSeasonDate(season.endsAt)}
          </p>
          <p className="text-xs font-bold opacity-80">
            جميع الطلبات المقدَّمة خلال هذه الفترة تُنسب للعام الدراسي {season.academicYear} ويحمل
            الطالب رقمه الأكاديمي الخاص بهذا العام.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-center text-[11px] font-black opacity-80">
            المتبقي لإغلاق باب التسجيل
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Unit value={countdown?.days ?? 0} label="يوم" />
            <Unit value={countdown?.hours ?? 0} label="ساعة" />
            <Unit value={countdown?.minutes ?? 0} label="دقيقة" />
            <Unit value={countdown?.seconds ?? 0} label="ثانية" />
          </div>
          {compact ? null : (
            <Button asChild variant="soft" className="w-full rounded-2xl font-black">
              <Link to="/reserve">ابدأ التسجيل الآن</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
