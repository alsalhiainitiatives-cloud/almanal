import {
  CalendarCheck,
  GraduationCap,
  Heart,
  Palette,
  School,
  Smile,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { Counter } from "./Counter";
import { staggerItem, StaggerGroup } from "./Reveal";
import { WaveDivider } from "./Decor";

const ICONS: LucideIcon[] = [Users, GraduationCap, Palette, CalendarCheck, Heart, School, Smile];

/** Extra indicators shown when site settings still carry only four figures. */
const EXTRA_STATS = [
  { value: 400, suffix: "+", label: "أسرة تثق بنا" },
  { value: 24, suffix: "", label: "فصلًا دراسيًا مجهزًا" },
  { value: 96, suffix: "%", label: "رضا أولياء الأمور" },
];

/**
 * Performance-indicator band: one hero figure in a glass feature panel beside a
 * grid of icon-led indicator tiles (editorial dashboard look).
 */
export function StatsBand() {
  const { stats } = useSiteContent();
  const [lead, ...others] = stats;
  const rest = others.length < 6 ? [...others, ...EXTRA_STATS.slice(0, 6 - others.length)] : others;

  return (
    <section className="relative overflow-hidden gradient-burgundy-deep pt-28 pb-28 md:pt-36 md:pb-36">
      <WaveDivider position="top" className="text-background" />
      <span className="pattern-grid-light absolute inset-0 opacity-30" aria-hidden />
      <span className="pattern-noise absolute inset-0 opacity-60" aria-hidden />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-20 start-1/4 size-72 rounded-full bg-gold/25 blur-[100px]"
        animate={{ y: [0, 24, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-20 mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center justify-between overflow-hidden rounded-[2.25rem] glass-dark p-8 text-center ring-gold-soft md:p-10"
          >
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-3 text-xs font-black tracking-[0.2em] text-gold uppercase">
                <span aria-hidden className="h-px w-10 gradient-gold-hairline" />
                المنال بالأرقام
                <span aria-hidden className="h-px w-10 gradient-gold-hairline" />
              </span>
              <h2 className="mt-5 text-2xl leading-snug font-black text-primary-foreground md:text-[2.1rem]">
                ثقة تكبر عامًا بعد عام
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-foreground/75">
                مؤشرات تحكي رحلتنا مع أسر عنيزة: أطفال نرعاهم، كادر نطوّره، وأنشطة تصنع الفرق كل عام.
              </p>
            </div>
            {lead ? (
              <div className="mt-10 flex flex-col items-center">
                <p className="font-latin text-[3.6rem] leading-none font-black text-gold md:text-[4.5rem]">
                  <Counter value={lead.value} suffix={lead.suffix} />
                </p>
                <span aria-hidden className="mt-4 h-0.5 w-16 rounded-full bg-gold" />
                <p className="mt-4 text-base font-bold text-primary-foreground/85">{lead.label}</p>
              </div>
            ) : null}
          </motion.div>

          <StaggerGroup className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((stat, index) => {
              const Icon = ICONS[(index + 1) % ICONS.length] ?? Users;
              return (
                <motion.div
                  key={stat.label}
                  variants={staggerItem}
                  className="group relative flex flex-col items-center overflow-hidden rounded-[1.75rem] border border-primary-foreground/12 bg-primary-foreground/8 p-6 text-center backdrop-blur-sm transition-colors duration-500 hover:border-gold/50 hover:bg-primary-foreground/12"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      backgroundImage:
                        "radial-gradient(70% 70% at 50% 0%, oklch(0.79 0.12 82 / 0.2) 0%, transparent 70%)",
                    }}
                  />
                  <span className="relative grid size-14 place-items-center rounded-2xl glass-dark text-gold ring-gold-soft transition-transform duration-500 group-hover:-rotate-6">
                    <Icon className="size-7" strokeWidth={1.8} />
                  </span>
                  <p className="relative mt-5 font-latin text-[2rem] leading-none font-black text-primary-foreground">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <span
                    aria-hidden
                    className="relative mt-3 h-0.5 w-8 rounded-full bg-gold transition-all duration-500 group-hover:w-16"
                  />
                  <p className="relative mt-3 text-sm leading-snug font-bold text-primary-foreground/75">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </StaggerGroup>
        </div>
      </div>

      <WaveDivider className="text-background" />
    </section>
  );
}
