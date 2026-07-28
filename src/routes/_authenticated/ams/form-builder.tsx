import { createFileRoute } from "@tanstack/react-router";

import { AmsShell } from "@/features/ams/components/AmsShell";
import { FormBuilder } from "@/features/ams/components/form-builder/FormBuilder";
import { useAuth } from "@/features/auth/AuthProvider";

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
  const { roles } = useAuth();
  const allowed = (roles as string[]).some((r) => r === "admin" || r === "supervisor");

  return (
    <AmsShell
      title="إدارة وتخصيص نظام التسجيل"
      description="أضف أو عدّل أو احذف مراحل التسجيل وحقولها وأنواع المستندات — وينعكس التغيير لحظيًا على نموذج التسجيل"
      wide
    >
      {allowed ? (
        <FormBuilder />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/70 bg-card p-10 text-center">
          <p className="text-sm font-black text-foreground">هذا القسم متاح لمدير النظام والمشرف فقط.</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            تواصل مع مدير النظام إذا كنت بحاجة إلى صلاحية تعديل نظام التسجيل.
          </p>
        </div>
      )}
    </AmsShell>
  );
}