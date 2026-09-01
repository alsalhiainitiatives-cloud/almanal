import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";

import { ModulePlaceholder } from "@/features/academics/components/ModulePlaceholder";
import { AmsShell } from "@/features/ams/components/AmsShell";

export const Route = createFileRoute("/_authenticated/ams/academics/assignments")({
  head: () => ({
    meta: [
      { title: "إسناد المعلمات — التتبع الأكاديمي | مدارس وروضة المنال" },
      { name: "description", content: "ربط كل معلمة بفصولها ومواد المنهج التي ترصدها." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AmsShell title="إسناد المعلمات" description="ربط كل معلمة بفصولها ومسؤولياتها الأكاديمية" wide>
      <ModulePlaceholder
        icon={UsersRound}
        title="إسناد المعلمات"
        description="لوحة إسناد تعرض المعلمات والفصول وتتيح الربط وفك الربط بضغطة واحدة، مع مراعاة صلاحيات الوصول للمنهج والتقييمات."
        bullets={[
          "إسناد معلمة لأكثر من فصل",
          "تحديد المواد التي ترصدها",
          "سجل التغييرات",
          "انتقال الصلاحيات آليًا",
        ]}
      />
    </AmsShell>
  ),
});
