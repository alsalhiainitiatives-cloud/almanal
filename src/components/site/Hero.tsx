import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { school } from "@/data/site";
import { images } from "@/data/gallery";
import { Doodle, WaveDivider } from "./Decor";

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-soft-cream pt-10 pb-24 md:pt-16 md:pb-36">
      {/* Colour clouds */}
      <div
        aria-hidden
        className="animate-float-slower pointer-events-none absolute top-10 -start-20 size-80 rounded-full bg-lavender/70 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -bottom-10 -end-10 size-96 rounded-full bg-sky/70 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute top-1/3 end-1/3 size-40 rounded-full bg-mint/70 blur-3xl"
      />
      {/* Playful hand-drawn accents */}
      <Doodle kind="loop" className="start-6 top-28 hidden text-gold/70 lg:block" />
      <Doodle kind="plane" className="animate-float-slow end-1/2 top-10 hidden text-secondary/40 xl:block" />
      <Doodle kind="dots" className="bottom-28 start-1/3 hidden size-14 text-primary/20 lg:block" />

      <div className="relative z-20 mx-auto grid max-w-7xl items-center gap-16 px-4 md:px-8 lg:grid-cols-[1.05fr_1fr]">
        <div className="text-center lg:text-start">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-primary shadow-card ring-1 ring-accent"
          >
            <Sparkles className="size-4 animate-wiggle text-gold" />
            {school.organization}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 text-4xl leading-[1.12] font-black text-foreground sm:text-5xl lg:text-[4.2rem]"
          >
            <span className="text-gradient block">مدارس وروضة المنال</span>
            <span
              aria-hidden
              style={{ width: "10rem", height: "0.5rem" }}
              className="mx-auto mt-4 block rounded-full bg-gold/60 lg:mx-0"
            />
            <span className="mt-4 block text-2xl leading-snug font-bold text-foreground/80 sm:text-3xl">
              حيث تكبر الطفولة بأمان ومحبة وتعليم راقٍ
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg lg:mx-0"
          >
            في عنيزة، نمنح أطفالنا بيئة تعليمية مستوحاة من قيمنا الإسلامية ومعايير الطفولة
            المبكرة العالمية — من الحضانة إلى المرحلة الابتدائية.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            <Button variant="hero" size="xl">
              التسجيل الآن
            </Button>
            <Button asChild variant="soft" size="xl">
              <Link to="/stages">
                <Compass className="size-5" />
                استكشف المراحل التعليمية
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/contact">
                <CalendarCheck className="size-5" />
                احجز زيارة
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.36 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            {[
              { icon: Star, label: "ثقة أكثر من 400 أسرة", tone: "bg-gold/20" },
              { icon: ShieldCheck, label: "بيئة آمنة ومراقبة", tone: "bg-sky" },
              { icon: HeartHandshake, label: "برنامج مونتيسوري معتمد", tone: "bg-mint" },
            ].map(({ icon: Icon, label, tone }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-2 rounded-full ${tone} px-4 py-2 text-xs font-bold text-primary md:text-sm`}
              >
                <Icon className="size-4" />
                {label}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Rotating dashed ring + colour blob behind the photo */}
          <div
            aria-hidden
            className="animate-spin-slow pointer-events-none absolute -inset-6 rounded-full border-2 border-dashed border-secondary/25 md:-inset-8"
          />
          <div
            aria-hidden
            className="animate-blob pointer-events-none absolute -inset-3 gradient-rose opacity-90"
          />
          <div className="animate-blob relative overflow-hidden shadow-glow">
            <img
              src={images.heroClassroom}
              alt="معلمة تلعب وتتعلم مع أطفال سعداء داخل فصول روضة المنال"
              width={1600}
              height={1200}
              className="aspect-square w-full object-cover"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="glass-panel absolute -bottom-4 start-2 rounded-3xl px-5 py-4 md:start-4"
          >
            <p className="text-xs text-muted-foreground">أوقات الدوام</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              الأحد – الخميس · 7:00 ص إلى 12:30 م
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62 }}
            className="absolute top-2 end-2 rounded-3xl bg-card px-5 py-4 text-center shadow-card md:end-4"
          >
            <p className="font-latin text-2xl font-black text-secondary">+20</p>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground">عامًا من العطاء</p>
          </motion.div>
        </motion.div>
      </div>

      <WaveDivider className="text-background" />
    </section>
  );
}