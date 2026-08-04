import { CalendarDays } from "lucide-react";
import { motion } from "motion/react";

import { galleryItems } from "@/data/gallery";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { useSiteMedia } from "@/features/site-content/media";
import { staggerItem, StaggerGroup } from "./Reveal";

export function NewsCards({ limit }: { limit?: number }) {
  const { news } = useSiteContent();
  const items = limit ? news.slice(0, limit) : news;
  const resolve = useSiteMedia(items.flatMap((item) => [item.image, item.video]));

  return (
    <StaggerGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const video = resolve(item.video);
        const image = resolve(item.image) || galleryItems[index % galleryItems.length].src;
        return (
          <motion.article
            key={item.slug}
            variants={staggerItem}
            className="premium-card group flex flex-col overflow-hidden rounded-[2.25rem]"
          >
            <div className="relative aspect-16/10 overflow-hidden">
              {video ? (
                <video
                  src={video}
                  poster={image}
                  controls
                  preload="metadata"
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src={image}
                  alt={item.title}
                  width={1000}
                  height={800}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              {video ? null : (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/60 via-primary/10 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90"
                />
              )}
              <span className="absolute top-4 end-4 rounded-full bg-card/90 px-3.5 py-1.5 text-xs font-black text-primary shadow-soft backdrop-blur ring-gold-soft">
                {item.category}
              </span>
              <span className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 rounded-full bg-primary/70 px-3 py-1 text-xs font-bold text-primary-foreground backdrop-blur">
                <CalendarDays className="size-3.5" />
                <time dateTime={item.date}>{item.dateLabel}</time>
              </span>
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-xl leading-snug font-extrabold text-foreground transition-colors duration-300 group-hover:text-secondary">
                {item.title}
              </h3>
              <span
                aria-hidden
                className="mt-3 block h-0.5 w-10 rounded-full bg-gold transition-all duration-500 group-hover:w-20"
              />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>
              {item.body ? (
                <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground/90">
                  {item.body}
                </p>
              ) : null}
            </div>
          </motion.article>
        );
      })}
    </StaggerGroup>
  );
}
