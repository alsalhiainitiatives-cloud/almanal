import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2 } from "lucide-react";

import { RESERVATION_ACTION_LABELS } from "../reservation-schema";
import { seatReservationEvents } from "../reservation.functions";

export type ReservationEvent = {
  id: string;
  action: string;
  title_ar: string;
  body_ar: string | null;
  actor_name: string | null;
  actor_kind: string;
  created_at: string;
};

const KIND_LABELS: Record<string, string> = {
  parent: "ولي الأمر",
  staff: "فريق التسجيل",
  system: "النظام",
};

/** Chronological audit log (سجل التدقيق) for a seat reservation request. */
export function ReservationAuditLog({
  reservationId,
  events,
}: {
  reservationId: string;
  events?: ReservationEvent[];
}) {
  const fetchEvents = useServerFn(seatReservationEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["reservations", "events", reservationId],
    queryFn: () => fetchEvents({ data: reservationId }),
    enabled: !events,
  });

  const rows = [...(events ?? data ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  ) as ReservationEvent[];

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
      <p className="flex items-center gap-2 text-xs font-black text-foreground">
        <History className="size-4 text-primary" />
        سجل التدقيق
      </p>
      {isLoading && !events ? (
        <Loader2 className="mt-3 size-4 animate-spin text-primary" />
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[11px] font-bold text-muted-foreground">لا توجد أحداث مسجلة.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-s-2 border-primary/20 ps-4">
          {rows.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
              <p className="text-[11px] font-black text-foreground">
                {RESERVATION_ACTION_LABELS[event.action] ?? event.title_ar}
              </p>
              {event.body_ar ? (
                <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{event.body_ar}</p>
              ) : null}
              <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">
                {KIND_LABELS[event.actor_kind] ?? event.actor_kind}
                {event.actor_name ? ` · ${event.actor_name}` : ""} ·{" "}
                {new Date(event.created_at).toLocaleString("ar-SA")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
