import { createFileRoute } from "@tanstack/react-router";
import { AmsShell } from "@/features/ams/components/AmsShell";
import { SeatBoard } from "@/features/ams/components/seats/SeatBoard";
export const Route = createFileRoute("/_authenticated/ams/seats")({
  head: () => ({
    meta: [
      { title: "إدارة المقاعد — مدارس وروضة المنال" },
      { name: "description", content: "متابعة سعة الفصول والمقاعد المتاحة والمحجوزة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeatsPage,
});
function SeatsPage() {
  return (
    <AmsShell
      title="إدارة المقاعد"
      description="سعة الفصول والمسجلون فعليًا وقوائم الانتظار مع نقل الطلاب بالسحب والإفلات"
      wide
    >
      <SeatBoard />
    </AmsShell>
  );
}
