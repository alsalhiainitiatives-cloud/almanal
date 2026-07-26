import { Quote } from "lucide-react";
import { motion } from "motion/react";

import { testimonials } from "@/data/site";
import { staggerItem, StaggerGroup } from "./Reveal";

export function Testimonials() {
  return (
    <StaggerGroup className="grid gap-6 md:grid-cols-2">
      {testimonials.map((item) => (
        <motion.figure
          key={item.name}
          variants={staggerItem}
          whileHover={{ y: -6 }}
          className="flex h-full flex-col rounded-4xl bg-card p-8 shadow-soft transition-shadow hover:shadow-card"
        >
          <Quote className="size-8 text-gold" />
          <blockquote className="mt-5 flex-1 text-base leading-relaxed text-foreground/85">
            {item.quote}
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 border-t border-border/70 pt-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-extrabold text-primary">
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