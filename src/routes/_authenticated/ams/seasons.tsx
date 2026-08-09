import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { SeasonsBoard } from "@/features/ams/components/seasons/SeasonsBoard";

export const Route = createFileRoute("/_authenticated/ams/seasons")({
  head: () => ({
    meta: [
      { title: "مواسم التسجيل وفتح باب القبول — مدارس وروضة المنال" },
      {
        name: "description",
        content: "فتح وإغلاق باب التسجيل لكل عام دراسي أو تسجيل إلحاقي، مع النسخ الاحتياطية الكاملة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeasonsPage,
});

function SeasonsPage() {
  return (
    <AmsShell
      title="مواسم التسجيل والقبول"
      description="افتح أو أغلق باب التسجيل لعام دراسي أو لتسجيل إلحاقي استثنائي — وكل طلب يُنسب لموسمه تلقائيًا"
      wide
    >
      <SeasonsBoard />
    </AmsShell>
  );
}