import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { AttendanceBoard } from "@/features/ams/components/students/AttendanceBoard";

export const Route = createFileRoute("/_authenticated/ams/students/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والغياب | مدارس وروضة المنال" },
      {
        name: "description",
        content: "تسجيل الحضور والغياب اليومي لكل فصل مع النسب الشهرية وربطها بتقويم الفصل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  return (
    <AmsShell
      title="الحضور والغياب"
      description="تحضير يومي سريع لكل فصل — حاضر، غائب، متأخر، وغياب بعذر — ويظهر ملخّصه في تقويم الفصل"
      wide
    >
      <AttendanceBoard />
    </AmsShell>
  );
}
