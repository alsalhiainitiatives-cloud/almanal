import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";

import { ModulePlaceholder } from "@/features/academics/components/ModulePlaceholder";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/academics/assessments")({
  head: () => ({
    meta: [
      { title: "التقييمات — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "رصد إتقان الطفل لكل درس ومهارة داخل المنهج." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="التقييمات" description="رصد إتقان الطفل لكل درس داخل المنهج" wide>
      <ModulePlaceholder
        icon={ClipboardCheck}
        title="التقييمات"
        description="شاشة رصد سريعة تعرض أطفال الفصل مقابل دروس المنهج، مع مستويات إتقان واضحة وملاحظات المعلمة."
        bullets={[
          "رصد جماعي لكل درس",
          "مستويات إتقان مبسطة",
          "ملاحظات وأدلة رقمية",
          "حساب نسب التقدم آليًا",
        ]}
      />
    </AmsShell>
  ),
});
