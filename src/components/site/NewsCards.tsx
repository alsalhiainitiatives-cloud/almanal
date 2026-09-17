import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { galleryItems } from "@/data/gallery";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { useSiteMedia } from "@/features/site-content/media";
import { staggerItem, StaggerGroup } from "./Reveal";

/** "12 يوليو 2026" -> { day: "12", month: "يوليو" } with safe fallbacks. */
function splitDate(dateLabel: string, date: string) {
  const parts = dateLabel.trim().split(/\s+/);
  if (parts.length >= 2) return { day: parts[0]!, month: parts[1]! };
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) {
    return {
      day: String(d.getDate()),
      month: new Intl.DateTimeFormat("ar", { month: "long" }).format(d),
    };
  }
  return { day: dateLabel, month: "" };
}

/**
 * Editorial news cards: framed cover media with an overlapping date plaque and
 * a gold hairline that draws on hover.
 */
export function NewsCards({ limit }: { limit?: number }) {
  const { news } = useSiteContent();
  const items = limit ? news.slice(0, limit) : news;
  const resolve = useSiteMedia(items.flatMap((item) => [item.image, item.video]));

  return (
    <StaggerGroup className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const video = resolve(item.video);
        const image = resolve(item.image) || galleryItems[index % galleryItems.length].src;
        const { day, month } = splitDate(item.dateLabel, item.date);
        return (
          <motion.article
            key={item.slug}
            variants={staggerItem}
            className="premium-card group flex flex-col overflow-hidden rounded-[2.25rem] p-3"
          >
            <div className="relative aspect-16/10 overflow-hidden rounded-[1.6rem]">
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
                  alt={`${item.title} — مدارس وروضة المنال`}
                  width={1000}
                  height={800}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.08]"
                />
              )}
              {video ? null : (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/55 via-primary/5 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95"
                />
              )}
              <span className="absolute top-4 start-4 rounded-full bg-card/90 px-3.5 py-1.5 text-xs font-black text-secondary shadow-soft backdrop-blur ring-gold-soft">
                {item.category}
              </span>
            </div>

            <div className="relative flex flex-1 flex-col px-4 pt-5 pb-5">
              <div className="flex items-start gap-4">
                <time
                  dateTime={item.date}
                  className="-mt-9 grid size-16 shrink-0 place-items-center rounded-[1.15rem] gradient-burgundy text-center leading-none text-primary-foreground shadow-card ring-gold-soft"
                >
                  <span className="font-latin text-xl font-black">{day}</span>
                  <span className="mt-1 text-[0.6rem] font-bold text-primary-foreground/85">
                    {month}
                  </span>
                </time>
                <h3 className="text-lg leading-snug font-extrabold text-foreground transition-colors duration-300 group-hover:text-secondary">
                  {item.title}
                </h3>
              </div>

              <span
                aria-hidden
                className="mt-4 block h-0.5 w-10 rounded-full bg-gold transition-all duration-500 group-hover:w-24"
              />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>
              {item.body ? (
                <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground/90">
                  {item.body}
                </p>
              ) : null}
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-black text-secondary opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                اقرأ التفاصيل
                <ArrowLeft className="size-4" />
              </span>
            </div>
          </motion.article>
        );
      })}
    </StaggerGroup>
  );
}
