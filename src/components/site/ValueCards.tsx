import {
  BookOpenText,
  GraduationCap,
  HeartHandshake,
  Palette,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { values } from "@/data/site";
import { staggerItem, StaggerGroup } from "./Reveal";

const icons: Record<string, LucideIcon> = {
  GraduationCap,
  ShieldCheck,
  Sparkles,
  BookOpenText,
  Palette,
  HeartHandshake,
};

const tones: Record<string, string> = {
  rose: "bg-accent text-primary",
  sky: "bg-sky text-primary",
  lavender: "bg-lavender text-primary",
  mint: "bg-mint text-primary",
  gold: "bg-gold/25 text-primary",
};

export function ValueCards() {
  return (
    <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {values.map((value) => {
        const Icon = icons[value.icon];
        return (
          <motion.div
            key={value.title}
            variants={staggerItem}
            whileHover={{ y: -8 }}
            className="group relative overflow-hidden rounded-[2.5rem] bg-card p-8 shadow-soft transition-shadow hover:shadow-card"
          >
            <span
              aria-hidden
              className={`absolute -top-10 -end-10 size-28 rounded-full opacity-50 blur-2xl ${tones[value.tone]}`}
            />
            <span
              className={`relative grid size-16 place-items-center rounded-[1.4rem] transition-transform duration-500 group-hover:-rotate-6 ${tones[value.tone]}`}
            >
              <Icon className="size-8" strokeWidth={2} />
            </span>
            <h3 className="relative mt-6 text-xl font-extrabold text-foreground">{value.title}</h3>
            <span
              aria-hidden
              className="relative mt-3 block h-1.5 w-12 rounded-full bg-gold/60"
            />
            <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
              {value.description}
            </p>
          </motion.div>
        );
      })}
    </StaggerGroup>
  );
}