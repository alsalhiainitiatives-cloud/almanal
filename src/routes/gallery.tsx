import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { galleryItems } from "@/data/gallery";

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
    ],
    links: [{ rel: "canonical", href: "/gallery" }],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const categories = useMemo(
    () => ["الكل", ...Array.from(new Set(galleryItems.map((item) => item.category)))],
    [],
  );
  const [active, setActive] = useState("الكل");

  const items = active === "الكل" ? galleryItems : galleryItems.filter((i) => i.category === active);

  return (
    <>
      <PageHero
        eyebrow="معرض الصور"
        title="لحظات من حياة أطفالنا"
        description="صور تحكي يوميات المنال: التعلّم، اللعب، الإبداع، والصداقة."
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
            {items.map((item, index) => (
              <motion.figure
                key={item.title}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className="group relative overflow-hidden rounded-4xl shadow-soft"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  width={1000}
                  height={800}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl bg-card/85 px-4 py-3 backdrop-blur-md">
                  <span className="block text-sm font-extrabold text-primary">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}