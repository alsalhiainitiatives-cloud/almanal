import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { StudentDataBoard } from "@/features/ams/components/students/StudentDataBoard";

export const Route = createFileRoute("/_authenticated/ams/students/data")({
  head: () => ({
    meta: [
      { title: "استيراد وتصدير الطلاب | مدارس وروضة المنال" },
      {
        name: "description",
        content: "استيراد الطلاب من ملف إكسل، إدارة بيانات الطلاب، وتصدير السجل بصيغ إكسل وCSV وPDF.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentDataPage,
});

function StudentDataPage() {
  return (
    <AmsShell
      title="استيراد وتصدير الطلاب"
      description="أدخل طلاب السنوات السابقة عبر ملف إكسل منسّق، وأدر بياناتهم وصدّرها بمرونة كاملة"
      wide
    >
      <StudentDataBoard />
    </AmsShell>
  );
}
