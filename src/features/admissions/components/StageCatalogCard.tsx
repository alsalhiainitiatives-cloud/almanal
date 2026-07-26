import { Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Sparkles, Users, Wallet } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { seatsLeft } from "../eligibility";
import { stageGallery, stageImage } from "../media";

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
  const activities = Array.isArray(stage.activities) ? (stage.activities as string[]) : [];
  const gallery = stageGallery(stage.slug);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/80 p-4 shadow-card backdrop-blur-xl"
    >
      <span
        aria-hidden
        className={`absolute -top-8 -end-8 size-28 rounded-full ${halo[stage.tone] ?? "bg-accent"} opacity-60 blur-2xl`}
      />

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

      <div className="relative flex flex-1 flex-col px-3 pt-6 pb-2">
        <h3 className="text-2xl font-black text-foreground">{stage.name_ar}</h3>
        {stage.tagline_ar ? (
          <p className="mt-1 text-sm font-bold text-secondary">{stage.tagline_ar}</p>
        ) : null}
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {stage.philosophy_ar}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Fact icon={Users} label="نسبة الإشراف" value={stage.teacher_ratio ?? "—"} />
          <Fact icon={Clock} label="الدوام" value={stage.operating_hours ?? "—"} />
          <Fact icon={Sparkles} label="أسلوب التعلم" value={stage.learning_approach_ar ?? "—"} />
          <Fact
            icon={Wallet}
            label="الرسوم تبدأ من"
            value={`${Number(stage.tuition_from).toLocaleString("ar-SA")} ر.س`}
          />
        </dl>

        {activities.length ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {activities.slice(0, 4).map((a) => (
              <li
                key={a}
                className="rounded-full bg-beige/80 px-2.5 py-1 text-[11px] font-bold text-foreground"
              >
                {a}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {gallery.map((g) => (
            <img
              key={g.src}
              src={g.src}
              alt={g.alt}
              loading="lazy"
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button asChild variant="hero" className="flex-1">
            <Link to="/admissions/stage/$slug/classrooms" params={{ slug: stage.slug }}>
              ابدأ التسجيل
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="soft" className="flex-1">
            <Link to="/admissions/stage/$slug" params={{ slug: stage.slug }}>
              عرض التفاصيل
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-background/70 p-3">
      <dt className="flex items-center gap-1.5 font-bold text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </dt>
      <dd className="mt-1 font-black text-foreground">{value}</dd>
    </div>
  );
}