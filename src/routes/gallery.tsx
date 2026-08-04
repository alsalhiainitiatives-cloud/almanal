import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { useSiteMedia } from "@/features/site-content/media";

const title = "معرض الصور | مدارس وروضة المنال";
const description =
  "لقطات من الحياة اليومية في مدارس وروضة المنال: فصول المونتيسوري، القراءة، الفنون، العلوم، الرياضة، ومبنى المدرسة.";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/gallery" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const content = useSiteContent();
  const hero = content.pages.gallery;
  const gallery = content.gallery;
  const resolve = useSiteMedia(gallery.map((item) => item.src));

  const categories = useMemo(
    () => ["الكل", ...Array.from(new Set(gallery.map((item) => item.category).filter(Boolean)))],
    [gallery],
  );
  const [active, setActive] = useState("الكل");

  const items = active === "الكل" ? gallery : gallery.filter((i) => i.category === active);

  return (
    <>
      <PageHero
        eyebrow={hero?.eyebrow ?? "معرض الصور"}
        title={hero?.title ?? "لحظات من حياة أطفالنا"}
        description={hero?.description ?? ""}
        image={hero?.image}
      />

      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={active === category ? "hero" : "outline"}
                size="sm"
                onClick={() => setActive(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const src = resolve(item.src);
              return (
                <motion.figure
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                  className="group relative overflow-hidden rounded-4xl shadow-soft"
                >
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
                  <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/85 px-4 py-3 backdrop-blur-md">
                    <span className="flex items-center gap-1.5 text-sm font-extrabold text-primary">
                      {item.kind === "video" ? <PlayCircle className="size-4" /> : null}
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                    <span className="text-xs font-bold text-muted-foreground">{item.category}</span>
                  </figcaption>
                </motion.figure>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
