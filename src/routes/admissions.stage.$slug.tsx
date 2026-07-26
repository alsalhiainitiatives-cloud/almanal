import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  BookOpen,
  Bus,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  Wallet,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { WaveDivider } from "@/components/site/Decor";
import { getStageBundle } from "@/features/admissions/catalog.functions";
import { seatsLeft } from "@/features/admissions/eligibility";
import { stageGallery, stageImage } from "@/features/admissions/media";

const stageQuery = (slug: string) =>
  queryOptions({
    queryKey: ["admissions", "stage", slug],
    queryFn: () => getStageBundle({ data: slug }),
  });

export const Route = createFileRoute("/admissions/stage/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(stageQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "المرحلة غير متاحة" }, { name: "robots", content: "noindex" }] };
    }
    const t = `${loaderData.stage.name_ar} | القبول في مدارس وروضة المنال`;
    const d =
      loaderData.stage.philosophy_ar?.slice(0, 155) ??
      "تفاصيل المرحلة التعليمية والفصول والمقاعد المتاحة والرسوم في مدارس وروضة المنال بعنيزة.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
      ],
    };
  },
  notFoundComponent: StageNotFound,
  errorComponent: StageNotFound,
  component: StageDetailPage,
});

function StageNotFound() {
  return (
    <div className="section-y text-center">
      <p className="text-xl font-black text-foreground">لم نعثر على هذه المرحلة</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/admissions">العودة لصفحة القبول</Link>
      </Button>
    </div>
  );
}

function StageDetailPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(stageQuery(slug));
  if (!data) return <StageNotFound />;

  const { stage, classrooms } = data;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const schedule = arr(stage.daily_schedule) as { time: string; title: string }[];
  const activities = arr(stage.activities) as string[];
  const outcomes = arr(stage.outcomes) as string[];
  const facilities = arr(stage.facilities) as string[];
  const teachers = arr(stage.teachers) as { name: string; title: string }[];
  const faqs = arr(stage.faqs) as { q: string; a: string }[];
  const gallery = stageGallery(stage.slug);
  const left = seatsLeft(stage);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-soft-cream pt-14 pb-28">
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 md:px-8 lg:grid-cols-2">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-bold text-primary shadow-card ring-1 ring-accent">
              <span aria-hidden className="size-2 rounded-full bg-gold" />
              {stage.age_label}
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-black text-foreground md:text-5xl">
              {stage.name_ar}
            </h1>
            <p className="mt-4 text-lg font-bold text-secondary">{stage.tagline_ar}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              {stage.philosophy_ar}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/admissions/stage/$slug/classrooms" params={{ slug: stage.slug }}>
                  ابدأ التسجيل الآن
                </Link>
              </Button>
              <Button asChild variant="soft" size="lg">
                <Link to="/contact">استفسار عن المرحلة</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal direction="left">
            <div className="relative overflow-hidden rounded-[3rem] shadow-card">
              <img
                src={stageImage(stage.slug)}
                alt={stage.name_ar}
                className="aspect-4/3 w-full object-cover"
              />
              <span className="absolute bottom-5 start-5 rounded-full bg-card/95 px-4 py-2 text-sm font-black text-primary shadow-soft backdrop-blur">
                {left > 0 ? `${left} مقعد متاح` : "اكتمل العدد"}
              </span>
            </div>
          </Reveal>
        </div>
        <WaveDivider className="text-background" />
      </section>

      {/* Quick facts */}
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FactCard icon={Users} label="نسبة الإشراف" value={stage.teacher_ratio ?? "—"} />
            <FactCard icon={Clock} label="ساعات الدوام" value={stage.operating_hours ?? "—"} />
            <FactCard
              icon={Wallet}
              label="الرسوم الدراسية"
              value={`${Number(stage.tuition_from).toLocaleString("ar-SA")} ر.س سنويًا`}
            />
            <FactCard
              icon={GraduationCap}
              label="رسوم القبول"
              value={`${Number(stage.admission_fee).toLocaleString("ar-SA")} ر.س`}
            />
          </div>
        </div>
      </section>

      {/* Schedule + outcomes */}
      <section className="section-y bg-beige/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-2xl font-black text-foreground">اليوم الدراسي</h2>
            <ol className="mt-6 space-y-3">
              {schedule.map((item) => (
                <li
                  key={item.time}
                  className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft"
                >
                  <span className="rounded-2xl bg-primary/10 px-3 py-1.5 text-sm font-black text-primary" dir="ltr">
                    {item.time}
                  </span>
                  <span className="text-sm font-bold text-foreground">{item.title}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal direction="left">
            <h2 className="text-2xl font-black text-foreground">مخرجات التعلم</h2>
            <ul className="mt-6 space-y-3">
              {outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3 rounded-3xl bg-card p-4 shadow-soft">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-mint-foreground" />
                  <span className="text-sm leading-relaxed text-foreground">{o}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-lg font-black text-foreground">الأنشطة الأسبوعية</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {activities.map((a) => (
                <li key={a} className="rounded-full bg-card px-4 py-2 text-sm font-bold text-foreground shadow-soft">
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Gallery */}
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="من داخل المرحلة" title="لمحات من يومنا" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((g, i) => (
              <Reveal key={g.src} delay={i * 0.06}>
                <img
                  src={g.src}
                  alt={g.alt}
                  loading="lazy"
                  className="aspect-4/3 w-full rounded-[2rem] object-cover shadow-soft"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Classrooms + team + facilities */}
      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="الفصول"
            title="فصول هذه المرحلة"
            description="لكل فصل لونه ومعلمته وسعته — اختر الفصل الأنسب لعمر طفلك."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((c) => (
              <div key={c.id} className="rounded-[2rem] bg-card p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-8 rounded-xl ring-2 ring-border"
                    style={{ backgroundColor: c.color_hex }}
                  />
                  <div>
                    <p className="font-black text-foreground">{c.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{c.teacher_name}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.description_ar}</p>
                <p className="mt-3 text-xs font-bold text-primary">
                  {seatsLeft(c) > 0 ? `${seatsLeft(c)} مقعد متاح من ${c.capacity}` : "اكتمل العدد"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-black text-foreground">فريق المرحلة</h3>
              <div className="mt-5 space-y-3">
                {teachers.map((t) => (
                  <div key={t.name} className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
                    <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 font-black text-primary">
                      {t.name.trim().charAt(0)}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">المرافق والفصول</h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {facilities.map((f) => (
                  <li key={f} className="rounded-3xl bg-card px-4 py-3 text-sm font-bold text-foreground shadow-soft">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services + FAQ */}
      <section className="section-y">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-foreground">خدمات مساندة</h2>
            <div className="mt-6 space-y-3">
              <ServiceRow icon={Bus} title="النقل المدرسي" body="حافلات مكيّفة مع مشرفة، تغطي أحياء عنيزة." />
              <ServiceRow icon={BookOpen} title="الكتب والأدوات" body="حزمة الكتب والحقيبة والأدوات جاهزة مع بداية العام." />
              <ServiceRow icon={GraduationCap} title="الزي المدرسي" body="زي صيفي وشتوي بشعار المدرسة ومقاسات مريحة." />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">أسئلة أولياء الأمور</h2>
            <Accordion type="single" collapsible className="mt-6 w-full space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`faq-${i}`}
                  className="overflow-hidden rounded-3xl border border-border/60 bg-card px-5"
                >
                  <AccordionTrigger className="py-4 text-start text-sm font-bold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="gradient-burgundy rounded-[3rem] p-10 text-center text-primary-foreground shadow-card">
            <h2 className="text-3xl font-black">جاهز لحجز مقعد طفلك في {stage.name_ar}؟</h2>
            <p className="mt-3 text-primary-foreground/85">
              المقاعد محدودة — أكمل الطلب في دقائق واحفظ تقدّمك متى شئت.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7 rounded-2xl font-black">
              <Link to="/admissions/stage/$slug/classrooms" params={{ slug: stage.slug }}>
                اختيار الفصل وبدء التسجيل
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function FactCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[2rem] bg-card p-6 shadow-soft">
      <Icon className="size-6 text-primary" />
      <p className="mt-4 text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black text-foreground">{value}</p>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Bus;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-3xl bg-card p-5 shadow-soft">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-black text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}