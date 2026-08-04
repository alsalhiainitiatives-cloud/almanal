import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { stages } from "@/data/site";
import { stageImages } from "@/data/gallery";
import { staggerItem, StaggerGroup } from "./Reveal";

const toneRing: Record<string, string> = {
  rose: "bg-accent text-primary",
  mint: "bg-mint text-primary",
  sky: "bg-sky text-primary",
};

const toneHalo: Record<string, string> = {
  rose: "bg-accent",
  mint: "bg-mint",
  sky: "bg-sky",
};

/** Stage cards shared by the home stages section and the /stages page. */
export function StageCards({ withDetails = false }: { withDetails?: boolean }) {
  return (
    <StaggerGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {stages.map((stage, index) => (
        <motion.article
          key={stage.slug}
          variants={staggerItem}
          whileHover={{ y: -12 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="premium-card group relative flex flex-col overflow-hidden rounded-[2.5rem] p-4 pt-5"
        >
          <span
            aria-hidden
            className={`absolute -top-6 -end-5 size-24 rounded-full ${toneHalo[stage.tone]} opacity-70 blur-2xl`}
          />
          <span aria-hidden className="number-ghost absolute top-4 start-6 text-4xl">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="relative overflow-hidden arch-shape">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-primary/70 via-primary/5 to-transparent"
            />
            <img
              src={stageImages[stage.slug]}
              alt={stage.title}
              width={1000}
              height={900}
              loading="lazy"
              className="aspect-4/5 w-full object-cover transition-transform duration-[1100ms] group-hover:scale-[1.12]"
            />
            <span
              className={`absolute bottom-4 start-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-black shadow-card backdrop-blur ring-gold-soft ${toneRing[stage.tone]}`}
            >
              {stage.badge}
            </span>
          </div>

          <div className="flex flex-1 flex-col px-4 pt-6 pb-3 text-center">
            <h3 className="text-2xl font-black text-foreground transition-colors duration-300 group-hover:text-secondary">
              {stage.title}
            </h3>
            <p className="mt-2 inline-flex self-center rounded-full bg-accent px-3.5 py-1 text-xs font-bold text-secondary">
              {stage.age}
            </p>
            <span
              aria-hidden
              className="mx-auto mt-4 block h-0.5 w-10 rounded-full bg-gold transition-all duration-500 group-hover:w-24"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{stage.short}</p>

            <ul
              className={`mt-5 space-y-2.5 text-start text-sm text-muted-foreground ${withDetails ? "" : "hidden lg:block"}`}
            >
              {(withDetails ? stage.details : stage.details.slice(0, 2)).map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-gold/25 text-gold-foreground">
                    <Check className="size-2.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex justify-center">
              <Button asChild variant="soft" size="default">
                <Link to="/admissions">
                  اعرف المزيد وسجّل
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-10 bottom-0 h-px gradient-gold-hairline opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        </motion.article>
      ))}
    </StaggerGroup>
  );
}
