import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { GuardianLinkBoard } from "@/features/ams/components/students/GuardianLinkBoard";

export const Route = createFileRoute("/_authenticated/ams/students/guardians")({
  head: () => ({
    meta: [
      { title: "ربط أولياء الأمور | مدارس وروضة المنال" },
      {
        name: "description",
        content: "دعوة أولياء أمور الطلاب المستوردين لتفعيل حساباتهم وربطهم بأبنائهم تلقائيًا.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuardiansPage,
});

function GuardiansPage() {
  return (
    <AmsShell
      title="ربط أولياء الأمور"
      description="دعوة أولياء أمور الطلاب المسجّلين خارج المنصة لإنشاء حساب، وربطهم بجميع أبنائهم تلقائيًا"
      wide
    >
      <GuardianLinkBoard />
    </AmsShell>
  );
}
