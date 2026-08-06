import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarHeart, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  seatReservationGate,
  startApplicationFromReservation,
} from "@/features/admissions/reservation.functions";
import { ReservationSelfService } from "./ReservationSelfService";

/** Parent-side status of the Step 0 seat reservation, with the continue action. */
export function ReservationBanner() {
  const navigate = useNavigate();
  const gate = useServerFn(seatReservationGate);
  const continueFn = useServerFn(startApplicationFromReservation);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({ queryKey: ["reservations", "gate"], queryFn: () => gate() });
  const reservation = data?.reservation ?? null;
  if (!reservation) return null;
  if (reservation.status === "rejected") {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm font-black text-foreground">تعذّر حجز المقعد حاليًا</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          {reservation.decision_note ||
            "وصل الفصل وقائمة الانتظار إلى الطاقة الاستيعابية القصوى. نرحب بك دائمًا عند توفّر مقعد."}
        </p>
      </div>
    );
  }

  if (reservation.status === "pending_review") {
    return (
      <div className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarHeart className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-foreground">طلب حجز المقعد قيد المراجعة</p>
            <p className="text-xs text-muted-foreground">
              سيتم إشعارك فورًا بالخطوة التالية لاستكمال بيانات التسجيل.
            </p>
          </div>
        </div>
        <ReservationSelfService
          reservationId={reservation.id}
          children={reservation.children ?? []}
        />
      </div>
    );
  }

  if (reservation.application_id) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-5">
      <PartyPopper className="size-5 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-foreground">تم قبول حجز المقعد — أكمل التسجيل</p>
        <p className="text-xs text-muted-foreground">
          بياناتك المُدخلة في خطوة الحجز ستظهر معبأة تلقائيًا في النموذج.
        </p>
      </div>
      <Button
        variant="hero"
        className="rounded-2xl text-xs font-bold"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { id } = await continueFn({ data: reservation.id });
            navigate({ to: "/apply/$applicationId", params: { applicationId: id } });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "تعذّر استكمال التسجيل");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        استكمال بيانات التسجيل
      </Button>
    </div>
  );
}
