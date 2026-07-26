import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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

export function StageCards({ withDetails = false }: { withDetails?: boolean }) {
  return (
    <StaggerGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {stages.map((stage) => (
        <motion.article
          key={stage.slug}
          variants={staggerItem}
          whileHover={{ y: -10 }}
          transition={{ type: "spring", stiffness: 250, damping: 22 }}
          className="group relative flex flex-col rounded-[2.75rem] bg-card p-4 pt-5 shadow-card"
        >
          <span
            aria-hidden
            className={`absolute -top-5 -end-4 size-20 rounded-full ${toneHalo[stage.tone]} opacity-70 blur-xl`}
          />
          <div className="relative overflow-hidden arch-shape">
            <img
              src={stageImages[stage.slug]}
              alt={stage.title}
              width={1000}
              height={900}
              loading="lazy"
              className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <span
              className={`absolute bottom-4 start-1/2 -translate-x-1/2 rounded-full bg-card/95 px-4 py-1.5 text-xs font-black text-primary shadow-card backdrop-blur ${toneRing[stage.tone]}`}
            >
              {stage.badge}
            </span>
          </div>
          <div className="flex flex-1 flex-col px-4 pt-6 pb-3 text-center">
            <h3 className="text-2xl text-foreground">{stage.title}</h3>
            <p className="mt-2 inline-flex self-center rounded-full bg-accent px-3 py-1 text-xs font-bold text-secondary">
              {stage.age}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{stage.short}</p>
            {withDetails ? (
              <ul className="mt-5 space-y-2.5 text-start text-sm text-muted-foreground">
                {stage.details.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-7 flex justify-center">
              <Button asChild variant="soft" size="default">
                <Link to="/stages">
                  اعرف المزيد
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.article>
      ))}
    </StaggerGroup>
  );
}