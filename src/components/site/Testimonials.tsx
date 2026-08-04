import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  Quote,
  Send,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";
import { fetchApprovedTestimonials, submitTestimonial } from "@/features/site-content/testimonials";
import { staggerItem, StaggerGroup } from "./Reveal";

type Card = { key: string; name: string; role: string; quote: string; rating?: number };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-3.5 ${i <= rating ? "fill-gold text-gold" : "text-border"}`}
        />
      ))}
    </span>
  );
}

function ShareForm() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { testimonialsForm } = useSiteContent();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("ولي أمر");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);

  const submit = useMutation({
    mutationFn: () =>
      submitTestimonial({
        name: name.trim() || (user?.email ?? "ولي أمر"),
        role: role.trim() || "ولي أمر",
        quote: quote.trim(),
        rating,
      }),
    onSuccess: () => {
      toast.success("شكرًا لك — سيتم نشر رأيك بعد المراجعة.");
      setQuote("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["site-testimonials", "approved"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر إرسال الرأي"),
  });

  if (!testimonialsForm.enabled) return null;

  return (
    <div className="mt-12 rounded-[2rem] border border-dashed border-border bg-card/70 p-6 text-center shadow-soft">
      <h3 className="text-lg font-extrabold text-foreground">{testimonialsForm.title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {testimonialsForm.note}
      </p>

      {!isAuthenticated ? (
        <Button asChild variant="soft" size="lg" className="mt-5">
          <Link to="/auth" search={{ reason: "testimonial" }}>
            <MessageSquarePlus className="size-5" />
            سجّل الدخول لمشاركة رأيك
          </Link>
        </Button>
      ) : !open ? (
        <Button variant="hero" size="lg" className="mt-5" onClick={() => setOpen(true)}>
          <MessageSquarePlus className="size-5" />
          اكتب رأيك
        </Button>
      ) : (
        <form
          className="mt-6 grid gap-4 text-start sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (quote.trim().length < 10) {
              toast.error("اكتب 10 أحرف على الأقل.");
              return;
            }
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">الاسم المعروض</Label>
            <Input
              value={name}
              maxLength={80}
              placeholder="مثال: أم عبدالله"
              onChange={(e) => setName(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">الصفة</Label>
            <Input
              value={role}
              maxLength={80}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-bold text-muted-foreground">رأيك</Label>
            <Textarea
              value={quote}
              rows={4}
              maxLength={1000}
              placeholder="شاركنا تجربتك مع المنال…"
              onChange={(e) => setQuote(e.target.value)}
              className="rounded-2xl leading-relaxed"
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Label className="text-xs font-bold text-muted-foreground">التقييم</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`تقييم ${i}`}
                  onClick={() => setRating(i)}
                  className="p-0.5"
                >
                  <Star className={`size-5 ${i <= rating ? "fill-gold text-gold" : "text-border"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="hero" disabled={submit.isPending}>
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              إرسال الرأي
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function Testimonials({
  variant = "grid",
  limit,
  showForm = true,
  moreLink = false,
}: {
  /** `carousel` pages through cards to keep the landing page short. */
  variant?: "grid" | "carousel";
  limit?: number;
  showForm?: boolean;
  moreLink?: boolean;
} = {}) {
  const { testimonials } = useSiteContent();
  const isMobile = useIsMobile();
  const { data: approved } = useQuery({
    queryKey: ["site-testimonials", "approved"],
    queryFn: fetchApprovedTestimonials,
    staleTime: 60_000,
  });

  const cards: Card[] = useMemo(() => {
    const all: Card[] = [
      ...(approved ?? []).map((row) => ({
        key: row.id,
        name: row.name,
        role: row.role,
        quote: row.quote,
        rating: row.rating,
      })),
      ...testimonials.map((item) => ({
        key: `cms-${item.name}-${item.quote.slice(0, 12)}`,
        name: item.name,
        role: item.role,
        quote: item.quote,
      })),
    ];
    return limit ? all.slice(0, limit) : all;
  }, [approved, testimonials, limit]);

  if (variant === "carousel") {
    return (
      <>
        <TestimonialCarousel cards={cards} perView={isMobile ? 1 : 2} />
        {moreLink ? (
          <div className="mt-10 text-center">
            <Button asChild variant="soft" size="lg">
              <Link to="/testimonials">
                عرض كل الآراء
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}
        {showForm ? <ShareForm /> : null}
      </>
    );
  }

  return (
    <>
      <StaggerGroup className="grid gap-6 md:grid-cols-2">
        {cards.map((item, index) => (
          <motion.div key={item.key} variants={staggerItem}>
            <TestimonialCard item={item} tilt={index % 2 === 0 ? -1 : 1} />
          </motion.div>
        ))}
      </StaggerGroup>
      {showForm ? <ShareForm /> : null}
    </>
  );
}

function TestimonialCard({ item, tilt = 0 }: { item: Card; tilt?: number }) {
  return (
    <motion.figure
      whileHover={{ y: -8, rotate: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-border/60 bg-card p-8 pt-10 shadow-card"
      style={{ rotate: `${tilt * 0.8}deg` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-accent/70 blur-2xl"
      />
      <span className="absolute -top-6 start-8 grid size-14 place-items-center rounded-2xl gradient-gold shadow-card">
        <Quote className="size-6 text-gold-foreground" />
      </span>
      <blockquote className="relative mt-4 flex-1 text-base leading-relaxed text-foreground/85">
        {item.quote}
      </blockquote>
      <figcaption className="relative mt-6 flex items-center gap-3 border-t border-dashed border-border pt-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-primary ring-2 ring-gold/40">
          {item.name.slice(0, 1)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-foreground">{item.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{item.role}</span>
        </span>
        {item.rating ? <Stars rating={item.rating} /> : null}
      </figcaption>
    </motion.figure>
  );
}

/** Paged testimonial viewer — keeps the landing page compact. */
function TestimonialCarousel({ cards, perView }: { cards: Card[]; perView: number }) {
  const pages = Math.max(1, Math.ceil(cards.length / perView));
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (page > pages - 1) setPage(0);
  }, [page, pages]);

  if (!cards.length) return null;

  const slice = cards.slice(page * perView, page * perView + perView);
  const move = (next: number) => {
    setDir(next > page ? 1 : -1);
    setPage(((next % pages) + pages) % pages);
  };

  return (
    <div>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: dir > 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -60 : 60 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 md:grid-cols-2"
          >
            {slice.map((item, i) => (
              <TestimonialCard key={item.key} item={item} tilt={i % 2 === 0 ? -1 : 1} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {pages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="الآراء السابقة"
            className="rounded-full"
            onClick={() => move(page - 1)}
          >
            <ChevronRight className="size-5" />
          </Button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`الصفحة ${i + 1}`}
                aria-current={i === page}
                onClick={() => move(i)}
                className={`h-2 rounded-full transition-all ${
                  i === page ? "w-8 bg-primary" : "w-2 bg-border hover:bg-secondary/50"
                }`}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="الآراء التالية"
            className="rounded-full"
            onClick={() => move(page + 1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
