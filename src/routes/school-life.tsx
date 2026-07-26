import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { galleryItems } from "@/data/gallery";

const title = "الحياة المدرسية | مدارس وروضة المنال";
const description =
  "يوم دراسي متوازن في المنال: حلقة الصباح، القراءة، الفنون، العلوم، الرياضة، والأنشطة الإثرائية في بيئة آمنة وسعيدة.";

export const Route = createFileRoute("/school-life")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/school-life" },
    ],
    links: [{ rel: "canonical", href: "/school-life" }],
  }),
  component: SchoolLifePage,
});

const schedule = [
  { time: "7:00 – 7:30", title: "الاستقبال والطابور الصباحي", body: "ترحيب، أذكار الصباح، وتهيئة نفسية للطفل." },
  { time: "7:30 – 9:00", title: "الحلقات التعليمية", body: "أنشطة اللغة والرياضيات وأدوات المونتيسوري." },
  { time: "9:00 – 9:30", title: "الفسحة والوجبة", body: "وجبة صحية ولعب حر بإشراف كامل." },
  { time: "9:30 – 11:00", title: "الأنشطة الإثرائية", body: "قراءة، فنون، علوم، أو رياضة حسب الجدول." },
  { time: "11:00 – 12:00", title: "قرآن وقيم", body: "حلقة القرآن والأناشيد والقصة الهادفة." },
  { time: "12:00 – 12:30", title: "الختام والانصراف", body: "مراجعة اليوم وتسليم منظّم للأسر." },
];

function SchoolLifePage() {
  return (
    <>
      <PageHero
        eyebrow="الحياة المدرسية"
        title="يوم مليء بالتعلّم والفرح"
        description="نصمم يوم الطفل ليكون متوازنًا بين التركيز والحركة، بين المعرفة والقيم، وبين العمل الفردي والجماعي."
      />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="الجدول اليومي" title="كيف يمضي طفلك يومه في المنال" />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schedule.map((item, i) => (
              <Reveal key={item.time} delay={i * 0.07}>
                <div className="h-full rounded-4xl border border-border/60 bg-card p-7 shadow-soft">
                  <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-primary">
                    <Clock className="size-3.5" />
                    <span dir="ltr">{item.time}</span>
                  </span>
                  <h3 className="mt-5 text-lg text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-beige/60">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="الأنشطة"
            title="أنشطة تكتشف موهبة كل طفل"
            description="قراءة، رسم، علوم، رياضة، فنون، ولعب هادف — كل نشاط له هدف تربوي واضح."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.slice(0, 6).map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <figure className="group overflow-hidden rounded-4xl bg-card shadow-soft">
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={1000}
                    height={800}
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <figcaption className="p-6">
                    <span className="block text-lg font-extrabold text-foreground">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.category}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}