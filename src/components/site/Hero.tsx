import { Link } from "@tanstack/react-router";
import { CalendarCheck, Compass, Sparkles, Star } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { school } from "@/data/site";
import { images } from "@/data/gallery";

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-cream pt-10 pb-20 md:pt-16 md:pb-28">
      <div
        aria-hidden
        className="animate-float-slower pointer-events-none absolute top-10 -start-20 size-80 rounded-full bg-lavender/60 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -bottom-10 -end-10 size-96 rounded-full bg-sky/60 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute top-1/3 end-1/3 size-40 rounded-full bg-mint/70 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 md:px-8 lg:grid-cols-2">
        <div className="text-center lg:text-start">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-primary shadow-soft"
          >
            <Sparkles className="size-4 text-gold" />
            {school.organization}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-6 text-4xl leading-[1.15] text-foreground sm:text-5xl lg:text-6xl"
          >
            <span className="text-gradient">مدارس وروضة المنال</span>
            <span className="mt-3 block text-2xl font-bold text-foreground/80 sm:text-3xl">
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
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground lg:justify-start"
          >
            <span className="inline-flex items-center gap-2">
              <Star className="size-4 fill-gold text-gold" />
              ثقة أكثر من 400 أسرة
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="size-4 fill-gold text-gold" />
              برنامج مونتيسوري معتمد
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="overflow-hidden rounded-4xl shadow-glow">
            <img
              src={images.heroClassroom}
              alt="معلمة تلعب وتتعلم مع أطفال سعداء داخل فصول روضة المنال"
              width={1600}
              height={1200}
              className="aspect-4/3 w-full object-cover"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="glass-panel absolute -bottom-6 start-4 rounded-3xl px-5 py-4 md:start-8"
          >
            <p className="text-xs text-muted-foreground">أوقات الدوام</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              الأحد – الخميس · 7:00 ص إلى 12:30 م
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}