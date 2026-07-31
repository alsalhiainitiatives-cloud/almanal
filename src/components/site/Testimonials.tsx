import { Quote } from "lucide-react";
import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { staggerItem, StaggerGroup } from "./Reveal";

export function Testimonials() {
  const { testimonials } = useSiteContent();
  return (
    <StaggerGroup className="grid gap-6 md:grid-cols-2">
      {testimonials.map((item, index) => (
        <motion.figure
          key={item.name}
          variants={staggerItem}
          whileHover={{ y: -6, rotate: 0 }}
          className={`relative flex h-full flex-col rounded-[2.5rem] bg-card p-8 pt-10 shadow-card transition-all ${
            index % 2 === 0 ? "md:-rotate-1" : "md:rotate-1"
          }`}
        >
          <span className="absolute -top-6 start-8 grid size-14 place-items-center rounded-2xl gradient-gold shadow-card">
            <Quote className="size-6 text-gold-foreground" />
          </span>
          <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground/85">
            {item.quote}
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 border-t border-dashed border-border pt-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-primary ring-2 ring-gold/40">
              {item.name.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-foreground">{item.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.role}</span>
            </span>
          </figcaption>
        </motion.figure>
      ))}
    </StaggerGroup>
  );
}