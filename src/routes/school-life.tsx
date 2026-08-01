import { createFileRoute } from "@tanstack/react-router";
import { Clock, PlayCircle } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { useSiteMedia } from "@/features/site-content/media";

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
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/school-life" }],
  }),
  component: SchoolLifePage,
});

function SchoolLifePage() {
  const content = useSiteContent();
  const hero = content.pages["school-life"];
  const { schedule, scheduleEyebrow, scheduleTitle, scheduleDescription, activities } =
    content.schoolLife;
  const items = content.gallery.slice(0, 6);
  const resolve = useSiteMedia(items.map((item) => item.src));

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "الحياة المدرسية"}
        title={hero?.title ?? "يوم مليء بالتعلّم والفرح"}
        description={hero?.description ?? ""}
      />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow={scheduleEyebrow}
            title={scheduleTitle}
            description={scheduleDescription || undefined}
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schedule.map((item, i) => (
              <Reveal key={`${item.time}-${item.title}`} delay={i * 0.07}>
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
            eyebrow={activities.eyebrow}
            title={activities.title}
            description={activities.description || undefined}
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => {
              const src = resolve(item.src);
              return (
                <Reveal key={item.id} delay={i * 0.06}>
                  <figure className="group h-full overflow-hidden rounded-4xl bg-card shadow-soft">
                    {item.kind === "video" ? (
                      <video
                        src={src}
                        controls
                        preload="metadata"
                        className="aspect-4/3 w-full bg-foreground/5 object-cover"
                      />
                    ) : (
                      <img
                        src={src}
                        alt={item.description || item.title}
                        width={1000}
                        height={800}
                        loading="lazy"
                        className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <figcaption className="p-6">
                      <span className="flex items-center gap-1.5 text-lg font-extrabold text-foreground">
                        {item.kind === "video" ? <PlayCircle className="size-4 text-primary" /> : null}
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {item.description || item.category}
                      </span>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
