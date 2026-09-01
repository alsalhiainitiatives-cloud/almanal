/**
 * Class Calendar — a single month grid that merges study-plan lessons, class
 * chat activity and lesson assessments for one classroom.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  MessagesSquare,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { academicsClassrooms } from "../academics.functions";
import { academicsCalendar } from "../calendar.functions";
import {
  EVENT_KIND_LABELS,
  EVENT_KIND_STYLES,
  WEEKDAY_LABELS,
  buildMonthGrid,
  groupByDate,
  isoOf,
  monthKey,
  monthLabel,
  shiftMonth,
  type CalendarEvent,
  type CalendarEventKind,
} from "../calendar";

const KIND_ICONS: Record<CalendarEventKind, typeof CalendarDays> = {
  lesson: CalendarDays,
  chat: MessagesSquare,
  assessment: ClipboardCheck,
};

export function ClassCalendar() {
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthKey());
  const [visible, setVisible] = useState<Record<CalendarEventKind, boolean>>({
    lesson: true,
    chat: true,
    assessment: true,
  });
  const today = isoOf(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(today);

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["academics", "classrooms"],
    queryFn: () => academicsClassrooms(),
  });

  const classrooms = roomsData?.classrooms ?? [];
  const activeId = classroomId ?? classrooms[0]?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["academics", "calendar", activeId, month],
    queryFn: () => academicsCalendar({ data: { classroomId: activeId!, month } }),
    enabled: Boolean(activeId),
  });

  const events = useMemo(
    () => (data?.events ?? []).filter((event) => visible[event.kind]),
    [data?.events, visible],
  );
  const byDate = useMemo(() => groupByDate(events), [events]);
  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const dayEvents = byDate.get(selectedDay) ?? [];

  if (roomsLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl border border-border/60 bg-card p-12 text-sm font-bold text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارِ تحميل الفصول…
      </div>
    );
  }

  if (!classrooms.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
        <p className="text-sm font-black text-foreground">لا توجد فصول متاحة لعرض التقويم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={activeId ?? undefined} onValueChange={setClassroomId}>
            <SelectTrigger className="h-11 w-[240px] rounded-2xl font-bold">
              <SelectValue placeholder="اختر الفصل" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.nameAr} — {room.stageNameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-2xl border border-border/60 p-1">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl"
              aria-label="الشهر السابق"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="min-w-[130px] text-center text-sm font-extrabold text-foreground">
              {monthLabel(month)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl"
              aria-label="الشهر التالي"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            className="rounded-2xl font-bold"
            onClick={() => {
              setMonth(monthKey());
              setSelectedDay(today);
            }}
          >
            اليوم
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(EVENT_KIND_LABELS) as CalendarEventKind[]).map((kind) => {
            const Icon = KIND_ICONS[kind];
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setVisible((prev) => ({ ...prev, [kind]: !prev[kind] }))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition-colors",
                  visible[kind]
                    ? EVENT_KIND_STYLES[kind]
                    : "border-border/60 bg-muted/40 text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {EVENT_KIND_LABELS[kind]}
                <span>{data?.totals[kind] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-border/60 bg-card p-16 text-sm font-bold text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جارِ تحميل التقويم…
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border/60 bg-muted/50">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="px-2 py-2.5 text-center text-[11px] font-black text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((date, index) => {
                const list = date ? (byDate.get(date) ?? []) : [];
                return (
                  <button
                    key={date ?? `pad-${index}`}
                    type="button"
                    disabled={!date}
                    onClick={() => date && setSelectedDay(date)}
                    className={cn(
                      "min-h-[104px] border-b border-l border-border/50 p-2 text-start align-top transition-colors",
                      !date && "bg-muted/20",
                      date === selectedDay && "bg-primary/5 ring-2 ring-inset ring-primary/40",
                      date && date !== selectedDay && "hover:bg-accent/40",
                    )}
                  >
                    {date && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "grid size-6 place-items-center rounded-full text-[11px] font-extrabold",
                              date === today
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {Number(date.slice(8, 10))}
                          </span>
                          {list.length > 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {list.length}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          {list.slice(0, 3).map((event) => (
                            <EventChip key={event.id} event={event} compact />
                          ))}
                          {list.length > 3 && (
                            <p className="text-[10px] font-bold text-muted-foreground">
                              +{list.length - 3} أخرى
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div>
              <p className="text-sm font-black text-foreground">
                {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("ar-SA", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {data?.classroomName ?? "الفصل"} — {dayEvents.length} عنصر
              </p>
            </div>

            {dayEvents.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-border/70 p-6 text-center text-xs font-bold text-muted-foreground">
                لا توجد أنشطة في هذا اليوم.
              </p>
            ) : (
              <ul className="space-y-2">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <EventChip event={event} />
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function EventChip({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const Icon = KIND_ICONS[event.kind];
  const body = (
    <div
      className={cn(
        "rounded-xl border px-2 py-1.5 text-start",
        EVENT_KIND_STYLES[event.kind],
        compact ? "text-[10px] font-bold" : "text-xs font-bold",
      )}
      style={
        event.kind === "lesson" && event.colorHex
          ? { borderColor: `${event.colorHex}66`, backgroundColor: `${event.colorHex}1a` }
          : undefined
      }
    >
      <span className="flex items-center gap-1.5">
        <Icon className={compact ? "size-3" : "size-3.5"} />
        <span className="line-clamp-1 flex-1">{event.title}</span>
        {!compact && event.published === false && (
          <Badge variant="outline" className="rounded-full text-[9px]">
            غير منشورة
          </Badge>
        )}
      </span>
      {!compact && event.subtitle && (
        <span className="mt-1 block line-clamp-2 text-[10px] font-semibold opacity-80">
          {event.subtitle}
        </span>
      )}
    </div>
  );

  if (compact || !event.link) return body;
  return (
    <Link to={event.link} className="block">
      {body}
    </Link>
  );
}
