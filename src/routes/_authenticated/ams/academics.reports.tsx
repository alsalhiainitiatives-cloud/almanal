import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

import { ModulePlaceholder } from "@/features/academics/components/ModulePlaceholder";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/academics/reports")({
  head: () => ({
    meta: [
      { title: "التقارير الأكاديمية — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "تقارير تقدم الطفل والفصل قابلة للطباعة والمشاركة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="التقارير الأكاديمية" description="تقارير التقدم للفصل والطفل وولي الأمر" wide>
      <ModulePlaceholder
        icon={BarChart3}
        title="التقارير الأكاديمية"
        description="تقارير جاهزة للطباعة تلخّص تقدم كل طفل في المواد والمحاور، مع مقارنة بمستوى الفصل."
        bullets={[
          "تقرير طفل قابل للطباعة",
          "ملخص أداء الفصل",
          "تصدير Excel و PDF",
          "مشاركة مع ولي الأمر",
        ]}
      />
    </AmsShell>
  ),
});
