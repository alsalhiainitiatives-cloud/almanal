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

export function StageCards({ withDetails = false }: { withDetails?: boolean }) {
  return (
    <StaggerGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {stages.map((stage) => (
        <motion.article
          key={stage.slug}
          variants={staggerItem}
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 250, damping: 22 }}
          className="group flex flex-col overflow-hidden rounded-4xl bg-card shadow-card"
        >
          <div className="relative aspect-4/3 overflow-hidden">
            <img
              src={stageImages[stage.slug]}
              alt={stage.title}
              width={1000}
              height={800}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span
              className={`absolute bottom-4 start-4 rounded-full px-3 py-1.5 text-xs font-bold shadow-soft ${toneRing[stage.tone]}`}
            >
              {stage.badge}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-7">
            <h3 className="text-2xl text-foreground">{stage.title}</h3>
            <p className="mt-1.5 text-sm font-semibold text-secondary">{stage.age}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{stage.short}</p>
            {withDetails ? (
              <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                {stage.details.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-7 pt-0">
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