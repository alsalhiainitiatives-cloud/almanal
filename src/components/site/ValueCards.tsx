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
            whileHover={{ y: -6 }}
            className="rounded-4xl border border-border/60 bg-card p-7 shadow-soft transition-shadow hover:shadow-card"
          >
            <span
              className={`grid size-14 place-items-center rounded-3xl ${tones[value.tone]}`}
            >
              <Icon className="size-7" strokeWidth={2} />
            </span>
            <h3 className="mt-6 text-xl text-foreground">{value.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {value.description}
            </p>
          </motion.div>
        );
      })}
    </StaggerGroup>
  );
}