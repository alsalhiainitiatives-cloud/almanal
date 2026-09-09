import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { WithdrawalsBoard } from "@/features/ams/components/students/WithdrawalsBoard";

export const Route = createFileRoute("/_authenticated/ams/students/withdrawals")({
  head: () => ({
    meta: [
      { title: "انسحاب الطلاب والخريجون | مدارس وروضة المنال" },
      {
        name: "description",
        content:
          "إدارة انسحاب الطلاب وتخرّجهم: تسوية المستحقات المالية، تأكيد الانسحاب، وإصدار شهادة مدة الالتحاق والمواد المدروسة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WithdrawalsPage,
});

function WithdrawalsPage() {
  return (
    <AmsShell
      title="انسحاب الطلاب والخريجون"
      description="طلبات الانسحاب والتخرّج، تسوية المستحقات المالية، وشهادة مدة الالتحاق الرسمية"
      wide
    >
      <WithdrawalsBoard />
    </AmsShell>
  );
}
