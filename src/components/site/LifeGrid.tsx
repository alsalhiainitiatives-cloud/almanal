import { PlayCircle } from "lucide-react";
import { motion } from "motion/react";

import type { MediaItem } from "@/features/site-content/defaults";
import { useSiteMedia } from "@/features/site-content/media";
import { staggerItem, StaggerGroup } from "./Reveal";

/**
 * Bento media grid shared by the home "school life" section and the
 * /school-life activities section — one look, one content source (site settings
 * gallery), so editing media in the dashboard updates both places.
 */
export function LifeGrid({
  items,
  featureFirst = true,
}: {
  items: MediaItem[];
  /** Makes the first tile a large hero cell (home-page layout). */
  featureFirst?: boolean;
}) {
  const resolve = useSiteMedia(items.map((item) => item.src));

  return (
    <StaggerGroup className="grid auto-rows-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const big = featureFirst && index === 0;
        const src = resolve(item.src);
        return (
          <motion.figure
            key={item.id}
            variants={staggerItem}
            className={`group relative isolate h-full overflow-hidden rounded-[2.25rem] shadow-card ring-gold-soft ${
              big ? "sm:col-span-2 sm:row-span-2" : ""
            }`}
          >
            {item.kind === "video" ? (
              <video
                src={src}
                controls
                preload="metadata"
                className={`w-full bg-foreground/5 object-cover ${big ? "h-full min-h-72" : "aspect-4/3"}`}
              />
            ) : (
              <img
                src={src}
                alt={item.description || `${item.title} في مدارس وروضة المنال`}
                width={1200}
                height={900}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.12] ${
                  big ? "h-full min-h-80 sm:min-h-full" : "aspect-4/3"
                }`}
              />
            )}

            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-primary/85 via-primary/15 to-transparent opacity-85 transition-opacity duration-500 group-hover:opacity-95"
            />
            <span
              aria-hidden
              className="animate-sheen pointer-events-none absolute -inset-y-10 -start-1/3 w-1/3 bg-linear-to-r from-transparent via-primary-foreground/25 to-transparent opacity-0 group-hover:opacity-100"
            />

            <figcaption className="absolute inset-x-5 bottom-5 translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
              <span className="inline-flex items-center gap-2 text-xs font-black text-gold">
                <span aria-hidden className="h-px w-6 bg-gold" />
                {item.category}
              </span>
              <span
                className={`mt-1.5 flex items-center gap-1.5 font-extrabold text-primary-foreground drop-shadow ${
                  big ? "text-xl md:text-2xl" : "text-base"
                }`}
              >
                {item.kind === "video" ? <PlayCircle className="size-4 text-gold" /> : null}
                {item.title}
              </span>
              {item.description && big ? (
                <span className="mt-2 block max-w-md text-sm leading-relaxed text-primary-foreground/80">
                  {item.description}
                </span>
              ) : null}
            </figcaption>
          </motion.figure>
        );
      })}
    </StaggerGroup>
  );
}
