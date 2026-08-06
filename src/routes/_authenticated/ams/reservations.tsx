import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { ReservationsBoard } from "@/features/ams/components/reservations/ReservationsBoard";

export const Route = createFileRoute("/_authenticated/ams/reservations")({
  head: () => ({
    meta: [
      { title: "طلبات حجز المقاعد — مدارس وروضة المنال" },
      { name: "description", content: "مراجعة طلبات حجز المقاعد المبدئية وقبولها أو رفضها." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReservationsPage,
});

function ReservationsPage() {
  return (
    <AmsShell
      title="طلبات حجز المقاعد"
      description="الخطوة صفر: مراجعة الطلبات المبدئية وتسكين الأطفال حسب الرغبات المتاحة"
    >
      <ReservationsBoard />
    </AmsShell>
  );
}
