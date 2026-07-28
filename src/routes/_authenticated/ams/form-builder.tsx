import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FormBuilder } from "@/features/ams/components/form-builder/FormBuilder";

export const Route = createFileRoute("/_authenticated/ams/form-builder")({
  head: () => ({
    meta: [
      { title: "إدارة وتخصيص نظام التسجيل — مدارس وروضة المنال" },
      {
        name: "description",
        content: "التحكم الكامل في مراحل نظام التسجيل وحقوله وأنواع المستندات المطلوبة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FormBuilderPage,
});

function FormBuilderPage() {
  return (
    <AmsShell
      title="إدارة وتخصيص نظام التسجيل"
      description="أضف أو عدّل أو احذف مراحل التسجيل وحقولها وأنواع المستندات — وينعكس التغيير لحظيًا على نموذج التسجيل"
      wide
    >
      <FormBuilder />
    </AmsShell>
  );
}