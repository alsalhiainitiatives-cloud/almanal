import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StageCards } from "@/components/site/StageCards";

const title = "المراحل التعليمية | مدارس وروضة المنال";
const description =
  "صغار المنال للأطفال أقل من 3 سنوات، كبار المنال ببرنامج مونتيسوري لمن هم أكبر من 3 سنوات، والمرحلة الابتدائية من الصف الأول إلى السادس.";

export const Route = createFileRoute("/stages")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/stages" },
    ],
    links: [{ rel: "canonical", href: "/stages" }],
  }),
  component: StagesPage,
});

const journey = [
  { step: "1", title: "استقبال ولقاء", body: "لقاء تعريفي مع الأسرة وتعرّف الطفل على بيئته الجديدة." },
  { step: "2", title: "تقييم لطيف", body: "ملاحظة مهارات الطفل لتحديد المستوى والدعم المناسب." },
  { step: "3", title: "خطة نمو", body: "أهداف تعليمية وسلوكية واضحة يتابعها فريق المرحلة." },
  { step: "4", title: "شراكة مستمرة", body: "تقارير دورية ولقاءات مع أولياء الأمور خلال العام." },
];

function StagesPage() {
  return (
    <>
      <PageHero
        eyebrow="المراحل التعليمية"
        title="رحلة تعليمية متصلة من الحضانة إلى السادس الابتدائي"
        description="كل مرحلة لها بيئتها وأدواتها ومعلماتها المتخصصات، مع انتقال سلس يحافظ على استقرار الطفل."
      />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <StageCards withDetails />
        </div>
      </section>

      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="كيف نبدأ"
            title="خطوات انتقال الطفل إلى المنال"
            description="نحرص أن تكون البداية هادئة ومطمئنة للطفل وأسرته."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map((item, i) => (
              <Reveal key={item.step} delay={i * 0.08}>
                <div className="h-full rounded-4xl bg-card p-7 shadow-soft">
                  <span className="grid size-12 place-items-center rounded-2xl gradient-burgundy text-lg font-extrabold text-primary-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-5 text-lg text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2} className="mt-12 text-center">
            <Button asChild variant="hero" size="lg">
              <Link to="/contact">تواصل معنا للاستفسار</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}