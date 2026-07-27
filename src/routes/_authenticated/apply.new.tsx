import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createApplication } from "@/features/admissions/application.functions";

export const Route = createFileRoute("/_authenticated/apply/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "بدء طلب تسجيل جديد | مدارس وروضة المنال" },
      {
        name: "description",
        content: "ابدأ طلب تسجيل جديد في مدارس وروضة المنال بعنيزة مباشرة دون اختيار مسبق للفصل.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">تعذّر بدء الطلب</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">تصفّح المراحل</Link>
      </Button>
    </div>
  ),
  component: StartApplicationPage,
});

function StartApplicationPage() {
  const navigate = useNavigate();
  const start = useServerFn(createApplication);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        const { id } = await start({ data: { stageId: null, classroomId: null } });
        navigate({ to: "/apply/$applicationId", params: { applicationId: id }, replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "تعذّر بدء الطلب");
        navigate({ to: "/admissions", replace: true });
      }
    })();
  }, [navigate, start]);

  return (
    <section className="section-y">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-lg font-black text-foreground">جارٍ تجهيز نموذج التسجيل…</p>
        <p className="text-sm text-muted-foreground">
          ستحدد المرحلة والفصول المفضّلة لكل طفل داخل النموذج حسب عمره.
        </p>
      </div>
    </section>
  );
}
