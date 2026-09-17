import { createFileRoute } from "@tanstack/react-router";

import { breadcrumbScript, pageHead } from "@/lib/seo";
import { Clock } from "lucide-react";
import { motion } from "motion/react";

import { LifeGrid } from "@/components/site/LifeGrid";
import { PageHero } from "@/components/site/PageHero";
import { SectionShell } from "@/components/site/SectionShell";
import { staggerItem, StaggerGroup } from "@/components/site/Reveal";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";


export const Route = createFileRoute("/school-life")({
  head: () => ({
    ...pageHead({
      path: "/school-life",
      title: "الحياة المدرسية | يوم طفلك في مدارس وروضة المنال",
      description:
        "يوم دراسي متوازن في المنال: حلقة الصباح، القراءة، الفنون، العلوم، الرياضة، والأنشطة الإثرائية في بيئة آمنة وسعيدة.",
    }),
    scripts: [
      breadcrumbScript([
        { name: "الرئيسية", path: "/" },
        { name: "الحياة المدرسية", path: "/school-life" },
      ]),
    ],
  }),
  component: SchoolLifePage,
});

function SchoolLifePage() {
  const content = useSiteContent();
  const hero = content.pages["school-life"];
  const { schedule, scheduleEyebrow, scheduleTitle, scheduleDescription, activities } =
    content.schoolLife;
  const items = content.gallery.slice(0, 9);

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "الحياة المدرسية"}
        title={hero?.title ?? "يوم مليء بالتعلّم والفرح"}
        description={hero?.description ?? ""}
        image={hero?.image}
      />

      {/* 01 · اليوم الدراسي */}
      <SectionShell
        id="schedule"
        index={1}
        tone="soft"
        eyebrow={scheduleEyebrow}
        title={scheduleTitle}
        description={scheduleDescription}
      >
        <StaggerGroup className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {schedule.map((item, i) => (
            <motion.div key={`${item.time}-${item.title}`} variants={staggerItem}>
              <div className="premium-card group relative h-full overflow-hidden rounded-[2.25rem] p-7">
                <span aria-hidden className="number-ghost absolute end-5 top-4 text-4xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-primary">
                  <Clock className="size-3.5" />
                  <span dir="ltr">{item.time}</span>
                </span>
                <h3 className="mt-5 text-lg text-foreground">{item.title}</h3>
                <span
                  aria-hidden
                  className="mt-3 block h-0.5 w-8 rounded-full bg-gold transition-all duration-500 group-hover:w-20"
                />
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </StaggerGroup>
      </SectionShell>

      {/* 02 · الأنشطة — same bento grid as the home "school life" section */}
      <SectionShell
        id="activities"
        index={2}
        tone="beige"
        eyebrow={activities.eyebrow}
        title={activities.title}
        description={activities.description}
        ctaLabel="معرض الصور والفيديو"
        ctaTo="/gallery"
      >
        <LifeGrid items={items} />
      </SectionShell>
    </>
  );
}
