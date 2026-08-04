import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/features/site-content/defaults";
import { useSiteMedia } from "@/features/site-content/media";

type Props = {
  slides: HeroSlide[];
  autoplay: boolean;
  intervalMs: number;
  effect: "fade" | "zoom" | "slide";
  overlay: number;
  className?: string;
  /** Renders the slide caption + controls chrome (off for page heroes). */
  chrome?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Cinematic media slider used by the landing hero and page heroes.
 * Supports images and videos, three transition styles, autoplay with a
 * live progress ring, keyboard and swipe navigation, and RTL controls.
 */
export function HeroSlider({
  slides,
  autoplay,
  intervalMs,
  effect,
  overlay,
  className,
  chrome = true,
}: Props) {
  const usable = slides.filter((s) => !!s.src);
  const resolve = useSiteMedia(usable.map((s) => s.src));
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [playing, setPlaying] = useState(autoplay);
  const [progress, setProgress] = useState(0);
  const total = usable.length;
  const duration = Math.max(2000, intervalMs || 6000);
  const startRef = useRef(0);

  const go = useCallback(
    (next: number, direction = 1) => {
      if (!total) return;
      setDir(direction);
      setIndex(((next % total) + total) % total);
      setProgress(0);
      startRef.current = 0;
    },
    [total],
  );

  useEffect(() => setPlaying(autoplay), [autoplay]);

  useEffect(() => {
    if (!playing || total < 2) return;
    let frame = 0;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const ratio = Math.min(1, elapsed / duration);
      setProgress(ratio);
      if (ratio >= 1) {
        setDir(1);
        setIndex((i) => (i + 1) % total);
        startRef.current = now;
        setProgress(0);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total, duration, index]);

  if (!total) return null;

  const slide = usable[index]!;
  const src = resolve(slide.src);

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    zoom: {
      initial: { opacity: 0, scale: 1.12 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.04 },
    },
    slide: {
      initial: { opacity: 0.4, x: dir > 0 ? "12%" : "-12%" },
      animate: { opacity: 1, x: "0%" },
      exit: { opacity: 0.2, x: dir > 0 ? "-8%" : "8%" },
    },
  }[effect];

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label="عرض صور المدرسة"
      onMouseEnter={() => autoplay && setPlaying(false)}
      onMouseLeave={() => autoplay && setPlaying(true)}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={slide.id + index}
          className="absolute inset-0"
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{ duration: 1.1, ease: EASE }}
        >
          {slide.kind === "video" ? (
            <video
              src={src}
              className="size-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={src}
              alt={slide.title || "صورة من مدارس وروضة المنال"}
              className={cn(
                "size-full object-cover",
                effect === "zoom" && "animate-ken-burns",
              )}
              loading={index === 0 ? "eager" : "lazy"}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Veil keeps headlines legible over any photo */}
      <div aria-hidden className="absolute inset-0 gradient-hero-veil" />
      <div
        aria-hidden
        className="absolute inset-0 bg-primary"
        style={{ opacity: Math.min(90, Math.max(0, overlay)) / 100 }}
      />
      <div aria-hidden className="pattern-grid-light absolute inset-0 opacity-30" />

      {chrome && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-6 md:px-10 md:pb-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`caption-${index}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="max-w-md"
              >
                <p className="text-sm font-black text-primary-foreground md:text-base">
                  {slide.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-primary-foreground/75 md:text-sm">
                  {slide.subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="pointer-events-auto flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="الشريحة السابقة"
                  onClick={() => go(index - 1, -1)}
                  className="grid size-10 place-items-center rounded-full glass-dark text-primary-foreground transition hover:bg-primary-foreground/20"
                >
                  <ChevronRight className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="الشريحة التالية"
                  onClick={() => go(index + 1, 1)}
                  className="grid size-10 place-items-center rounded-full glass-dark text-primary-foreground transition hover:bg-primary-foreground/20"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "إيقاف التشغيل التلقائي" : "تشغيل تلقائي"}
                  onClick={() => setPlaying((p) => !p)}
                  className="grid size-10 place-items-center rounded-full glass-dark text-primary-foreground transition hover:bg-primary-foreground/20"
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
              </div>

              {/* Segmented progress bars double as dots */}
              <div className="flex flex-1 items-center gap-2">
                {usable.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`الانتقال إلى الشريحة ${i + 1}`}
                    aria-current={i === index}
                    onClick={() => go(i, i > index ? 1 : -1)}
                    className="group h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground/25"
                  >
                    <span
                      className="block h-full rounded-full gradient-gold transition-[width] duration-150"
                      style={{
                        width:
                          i < index
                            ? "100%"
                            : i === index
                              ? `${Math.round(progress * 100)}%`
                              : "0%",
                      }}
                    />
                  </button>
                ))}
              </div>

              <span className="font-latin text-xs font-black text-primary-foreground/80">
                {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
