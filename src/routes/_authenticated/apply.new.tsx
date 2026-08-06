import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  seatReservationGate,
  startApplicationFromReservation,
} from "@/features/admissions/reservation.functions";

export const Route = createFileRoute("/_authenticated/apply/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "بدء طلب تسجيل جديد | مدارس وروضة المنال" },
      {
        name: "description",
        content: "ابدأ طلب تسجيل جديد في مدارس وروضة المنال بعنيزة مباشرة دون اختيار مسبق للفصل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">تعذّر بدء الطلب</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">تصفّح المراحل</Link>
      </Button>
    </div>
  ),
  component: StartApplicationPage,
});

function StartApplicationPage() {
  const navigate = useNavigate();
  const gate = useServerFn(seatReservationGate);
  const startFromReservation = useServerFn(startApplicationFromReservation);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        const status = await gate();
        // Step 0 gate: the full journey opens only after the seat is reserved.
        if (status.approved && status.reservation) {
          const { id } = await startFromReservation({ data: status.reservation.id });
          navigate({ to: "/apply/$applicationId", params: { applicationId: id }, replace: true });
          return;
        }
        navigate({ to: "/reserve", replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "تعذّر بدء الطلب");
        navigate({ to: "/reserve", replace: true });
      }
    })();
  }, [navigate, gate, startFromReservation]);

  return (
    <section className="section-y">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-lg font-black text-foreground">جارٍ تجهيز خطوات التسجيل…</p>
        <p className="text-sm text-muted-foreground">
          نتحقق من حالة حجز المقعد قبل فتح نموذج التسجيل الكامل.
        </p>
      </div>
    </section>
  );
}
