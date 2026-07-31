import { CalendarDays } from "lucide-react";
import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { galleryItems } from "@/data/gallery";
import { staggerItem, StaggerGroup } from "./Reveal";

export function NewsCards({ limit }: { limit?: number }) {
  const { news } = useSiteContent();
  const items = limit ? news.slice(0, limit) : news;

  return (
    <StaggerGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <motion.article
          key={item.slug}
          variants={staggerItem}
          whileHover={{ y: -8 }}
          className="group flex flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-soft transition-shadow hover:shadow-card"
        >
          <div className="relative aspect-16/10 overflow-hidden rounded-[2.5rem] rounded-b-[3.5rem]">
            <img
              src={galleryItems[index % galleryItems.length].src}
              alt={item.title}
              width={1000}
              height={800}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute top-4 end-4 rounded-full bg-card/90 px-3 py-1 text-xs font-black text-primary shadow-soft backdrop-blur">
              {item.category}
            </span>
          </div>
          <div className="-mt-6 flex flex-1 flex-col rounded-[2.5rem] bg-card p-7 pt-6">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-3.5" />
                <time dateTime={item.date}>{item.dateLabel}</time>
              </span>
            </div>
            <h3 className="mt-4 text-xl leading-snug text-foreground">{item.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {item.excerpt}
            </p>
          </div>
        </motion.article>
      ))}
    </StaggerGroup>
  );
}