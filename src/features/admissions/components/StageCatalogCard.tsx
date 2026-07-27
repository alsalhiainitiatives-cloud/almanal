import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { seatsLeft } from "../eligibility";
import { stageImage } from "../media";

type Stage = {
  id: string;
  slug: string;
  name_ar: string;
  tagline_ar: string | null;
  age_label: string;
  philosophy_ar: string | null;
  learning_approach_ar: string | null;
  operating_hours: string | null;
  teacher_ratio: string | null;
  tuition_from: number;
  total_seats: number;
  taken_seats: number;
  activities: unknown;
  tone: string;
};

const halo: Record<string, string> = {
  rose: "bg-accent",
  mint: "bg-mint",
  sky: "bg-sky",
};

export function StageCatalogCard({ stage, index }: { stage: Stage; index: number }) {
  const left = seatsLeft(stage);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/80 p-4 shadow-card backdrop-blur-xl transition hover:-translate-y-1.5 hover:shadow-card"
    >
      <span
        aria-hidden
        className={`absolute -top-8 -end-8 size-28 rounded-full ${halo[stage.tone] ?? "bg-accent"} opacity-60 blur-2xl`}
      />
      <Link
        to="/admissions/stage/$slug/classrooms"
        params={{ slug: stage.slug }}
        className="relative flex flex-col"
      >
      <div className="relative overflow-hidden rounded-[2rem]">
        <img
          src={stageImage(stage.slug)}
          alt={stage.name_ar}
          loading="lazy"
          className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute top-4 start-4 rounded-full bg-card/95 px-3 py-1 text-xs font-black text-primary shadow-soft backdrop-blur">
          {stage.age_label}
        </span>
        <span
          className={`absolute top-4 end-4 rounded-full px-3 py-1 text-xs font-black shadow-soft backdrop-blur ${
            left > 0 ? "bg-mint text-foreground" : "bg-destructive/90 text-primary-foreground"
          }`}
        >
          {left > 0 ? `${left} مقعد متاح` : "اكتمل العدد"}
        </span>
      </div>

      <div className="relative flex flex-1 flex-col px-3 pt-6 pb-2 text-start">
        <h3 className="text-2xl font-black text-foreground">{stage.name_ar}</h3>
        {stage.tagline_ar ? (
          <p className="mt-1 text-sm font-bold text-secondary">{stage.tagline_ar}</p>
        ) : null}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {stage.philosophy_ar}
        </p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
          عرض الفصول المتاحة
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </span>
      </div>
      </Link>
    </motion.article>
  );
}