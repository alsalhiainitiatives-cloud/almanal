import { Link } from "@tanstack/react-router";
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  HeartHandshake,
  Languages,
  Palette,
  Puzzle,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Doodle, WaveDivider } from "@/components/site/Decor";
import { images } from "@/data/gallery";
import type { Program } from "@/data/programs";

const icons: Record<string, LucideIcon> = {
  Puzzle,
  Languages,
  BookOpenText,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  Palette,
  HeartHandshake,
};

const tones = ["bg-accent", "bg-mint", "bg-sky", "bg-lavender", "bg-beige", "bg-gold/25"];

export function ProgramPage({ program }: { program: Program }) {
  const heroImage = program.slug === "kindergarten" ? images.stageMontessori : images.stagePrimary;

  return (
    <>
      <PageHero eyebrow={program.eyebrow} title={program.title} description={program.description} />

      {/* Snapshot + image */}
      <section className="section-y">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
          <Reveal direction="right" className="relative">
            <div className="absolute -top-8 -start-8 size-40 rounded-full bg-mint/60 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden blob-shape-alt shadow-card">
              <img
                src={heroImage}
                alt={`${program.title} في مدارس وروضة المنال بعنيزة`}
                className="aspect-4/3 size-full object-cover"
                loading="lazy"
              />
            </div>
            <Doodle kind="loop" className="-bottom-6 end-4 text-gold/70" />
          </Reveal>

          <Reveal direction="left" className="space-y-4">
            {[
              { icon: Users, label: "الأعمار", value: program.ages },
              { icon: Clock, label: "أوقات الدراسة", value: program.hours },
              { icon: HeartHandshake, label: "الإشراف", value: program.ratio },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-4 rounded-4xl bg-card p-5 shadow-soft"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <row.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-xs font-bold text-muted-foreground">{row.label}</span>
                  <span className="text-base font-bold text-foreground">{row.value}</span>
                </span>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild variant="hero" size="lg">
                <Link to="/contact">استفسر عن التسجيل</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/school-life">اليوم الدراسي</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section className="relative section-y bg-beige/60">
        <WaveDivider position="top" className="text-beige/60" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading eyebrow="لماذا هذا البرنامج" title="ملامح مميزة في كل يوم" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {program.highlights.map((item, i) => {
              const Icon = icons[item.icon] ?? Sparkles;
              return (
                <Reveal key={item.title} delay={i * 0.07}>
                  <div className="h-full rounded-4xl bg-card p-7 shadow-soft transition-shadow hover:shadow-card">
                    <span className={`grid size-14 place-items-center rounded-3xl ${tones[i % tones.length]} text-primary`}>
                      <Icon className="size-6" />
                    </span>
                    <h3 className="mt-5 text-lg text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
        <WaveDivider position="bottom" className="text-beige/60" />
      </section>

      {/* Curriculum */}
      <section className="section-y">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="المنهج"
            title="أبرز محاور المنهج"
            description="محاور مترابطة تُقدَّم بطريقة عملية وممتعة تناسب عمر الطفل."
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {program.curriculum.map((area, i) => (
              <Reveal key={area.area} delay={i * 0.06}>
                <div className="h-full rounded-[2.5rem] border border-border/60 bg-card p-7 shadow-soft">
                  <span className={`inline-flex rounded-full ${tones[i % tones.length]} px-4 py-1.5 text-sm font-bold text-primary`}>
                    {area.area}
                  </span>
                  <ul className="mt-5 space-y-3">
                    {area.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly activities */}
      <section className="relative overflow-hidden section-y gradient-soft-cream">
        <div className="pattern-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeading
            eyebrow="الأنشطة الأسبوعية"
            title="جدول الأسبوع في لمحة"
            description="كل يوم له نكهته الخاصة بين التعلّم والحركة والإبداع."
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {program.weekly.map((day, i) => (
              <Reveal key={day.day} delay={i * 0.06}>
                <div className="h-full rounded-4xl bg-card p-6 shadow-soft">
                  <span className="inline-flex items-center gap-2 rounded-full gradient-burgundy px-4 py-1.5 text-xs font-bold text-primary-foreground">
                    <CalendarDays className="size-3.5 text-gold" />
                    {day.day}
                  </span>
                  <ul className="mt-5 space-y-3">
                    {day.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-2xl bg-accent/50 px-4 py-2.5 text-sm font-semibold text-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="section-y">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <SectionHeading eyebrow="النواتج" title="ماذا يكتسب طفلك؟" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {program.outcomes.map((outcome, i) => (
              <Reveal key={outcome} delay={i * 0.06}>
                <div className="flex h-full items-center gap-4 rounded-4xl bg-card p-6 shadow-soft">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-primary">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{outcome}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2} className="mt-12 text-center">
            <Button asChild variant="hero" size="lg">
              <Link to="/contact">تواصل معنا للاستفسار</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
