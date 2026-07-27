import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { getStageBundle } from "@/features/admissions/catalog.functions";
import { createApplication } from "@/features/admissions/application.functions";
import { seatsLeft } from "@/features/admissions/eligibility";
import { supabase } from "@/integrations/supabase/client";

const stageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["admissions", "stage", slug],
    queryFn: () => getStageBundle({ data: slug }),
  });

export const Route = createFileRoute("/admissions/stage/$slug/classrooms")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(stageQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "غير متاح" }, { name: "robots", content: "noindex" }] };
    }
    const t = `اختيار الفصل — ${loaderData.stage.name_ar} | مدارس وروضة المنال`;
    const d = `اختر الفصل المناسب لطفلك في ${loaderData.stage.name_ar} وتعرّف على المعلمة والمقاعد المتاحة قبل بدء طلب القبول.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">تعذّر تحميل الفصول</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة للقبول</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">لم نعثر على هذه المرحلة</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة للقبول</Link>
      </Button>
    </div>
  ),
  component: ClassroomsPage,
});

function ClassroomsPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(stageQuery(slug));
  const navigate = useNavigate();
  const start = useServerFn(createApplication);
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return null;
  const { stage, classrooms } = data;

  async function handleStart(classroomId: string) {
    if (!data) return;
    setBusy(classroomId);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.info("سجّل الدخول أو أنشئ حسابًا لمتابعة الطلب");
        navigate({ to: "/auth" });
        return;
      }
      const res = await start({ data: { stageId: data.stage.id, classroomId } });
      navigate({ to: "/apply/$applicationId", params: { applicationId: res.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر بدء الطلب");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHero
        eyebrow={stage.name_ar}
        title="اختر فصل طفلك"
        description="كل فصل له معلمته وسعته ولونه — اضغط «ابدأ التسجيل» للفصل المناسب أو «عرض التفاصيل» لمعرفة المزيد عنه."
      />

      <section className="section-y">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((c, i) => {
              const left = seatsLeft(c);
              const full = left <= 0;
              return (
                <motion.article
                  key={c.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className={`relative flex flex-col overflow-hidden rounded-[2rem] border-2 p-6 text-start shadow-soft transition ${
                    full
                      ? "border-border/50 bg-muted/40"
                      : "border-transparent bg-card hover:-translate-y-1 hover:shadow-card"
                  }`}
                >
                  <span
                    aria-hidden
                    className="block size-10 rounded-2xl ring-2 ring-border"
                    style={{ backgroundColor: c.color_hex }}
                  />
                  <p className="mt-4 text-lg font-black text-foreground">{c.name_ar}</p>
                  <p className="text-sm font-bold text-secondary">{c.teacher_name}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {c.description_ar}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-beige px-3 py-1 text-xs font-black text-foreground">
                    <Users className="size-3.5" />
                    {full ? "اكتمل العدد" : `${left} مقعد من ${c.capacity}`}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <Button
                      variant="hero"
                      className="flex-1"
                      disabled={full || busy === c.id}
                      onClick={() => handleStart(c.id)}
                    >
                      {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      ابدأ التسجيل
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button asChild variant="soft" className="flex-1">
                      <Link
                        to="/admissions/stage/$slug/classroom/$classroomSlug"
                        params={{ slug, classroomSlug: c.slug }}
                      >
                        عرض التفاصيل
                      </Link>
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-[2.5rem] bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">
              سيتم حجز المقعد مؤقتًا لمدة 7 أيام أثناء استكمال الطلب.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="soft" size="lg">
                <Link to="/admissions">العودة للمراحل</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}