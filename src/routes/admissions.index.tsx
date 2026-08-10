import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { StageCatalogCard } from "@/features/admissions/components/StageCatalogCard";
import {
  RegistrationClosedNotice,
  useRegistrationGate,
} from "@/features/admissions/components/RegistrationGate";
import { listStages } from "@/features/admissions/catalog.functions";

const title = "المراحل التعليمية والتسجيل | مدارس وروضة المنال";
const description =
  "تعرّف على المراحل التعليمية في مدارس وروضة المنال بعنيزة — صغار المنال، مونتيسوري، والابتدائي — واطّلع على المقاعد المتاحة وابدأ التسجيل خطوة بخطوة.";

const stagesQuery = queryOptions({
  queryKey: ["admissions", "stages"],
  queryFn: () => listStages(),
});

export const Route = createFileRoute("/admissions/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(stagesQuery),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/admissions" }],
  }),
  errorComponent: () => (
    <div className="section-y text-center">
      <p className="text-lg font-bold text-foreground">تعذّر تحميل المراحل التعليمية حاليًا.</p>
      <p className="mt-2 text-sm text-muted-foreground">يرجى تحديث الصفحة أو المحاولة لاحقًا.</p>
    </div>
  ),
  component: AdmissionsPage,
});

const steps = [
  { icon: Sparkles, title: "اختر المرحلة", body: "ثلاث مراحل حسب عمر طفلك." },
  { icon: FileCheck2, title: "اختر الفصل", body: "بطاقة لكل فصل بلونه ومعلمته." },
  { icon: CalendarCheck, title: "أكمل الطلب", body: "خطوات قصيرة مع حفظ تلقائي." },
  { icon: ShieldCheck, title: "تابع طلبك", body: "رقم تتبع وحالة مباشرة." },
];

function AdmissionsPage() {
  const { data: stages } = useSuspenseQuery(stagesQuery);
  const hero = useSiteContent().pages.admissions;
  const registration = useRegistrationGate();

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "المراحل والتسجيل"}
        title={hero?.title ?? "المراحل التعليمية والتسجيل"}
        description={
          hero?.description ??
          "خطوتان فقط: تصفّح المراحل واختر الفصل المناسب لطفلك، أو تابع طلباتك السابقة."
        }
        image={hero?.image}
      >
        <Button asChild variant="hero" size="lg">
          <Link to="/reserve">ابدأ التسجيل الآن</Link>
        </Button>
        <Button asChild variant="soft" size="lg">
          <a href="#stages">تصفّح المراحل</a>
        </Button>
        <Button asChild variant="soft" size="lg">
          <Link to="/my-applications">متابعة طلباتي</Link>
        </Button>
      </PageHero>

      <section id="stages" className="section-y scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-12">
            <SeasonBanner />
          </div>
          {!registration.open ? (
            <div className="mb-12">
              <RegistrationClosedNotice />
            </div>
          ) : null}
          <SectionHeading
            eyebrow="المراحل المتاحة"
            title="اختر المرحلة المناسبة لعمر طفلك"
            description="اضغط على المرحلة لعرض فصولها المتاحة."
          />
          {stages.length === 0 ? (
            <div className="mt-12 rounded-[2.5rem] border border-dashed border-border bg-card/60 p-12 text-center">
              <p className="text-lg font-bold text-foreground">لا توجد مراحل متاحة للتسجيل حاليًا</p>
              <p className="mt-2 text-sm text-muted-foreground">
                سيتم فتح التسجيل قريبًا — تابع أخبار المدرسة أو تواصل معنا.
              </p>
              <Button asChild variant="soft" className="mt-6">
                <Link to="/contact">تواصل معنا</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {stages.map((stage, i) => (
                <StageCatalogCard key={stage.id} stage={stage} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="كيف تسير الرحلة"
            title="أربع خطوات بسيطة"
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="h-full rounded-4xl bg-card p-7 shadow-soft">
                  <span className="grid size-12 place-items-center rounded-2xl gradient-burgundy text-primary-foreground">
                    <s.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-black text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}