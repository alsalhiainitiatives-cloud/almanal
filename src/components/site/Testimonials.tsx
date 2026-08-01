import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, MessageSquarePlus, Quote, Send, Star } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

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

export function Testimonials() {
  const { testimonials } = useSiteContent();
  const { data: approved } = useQuery({
    queryKey: ["site-testimonials", "approved"],
    queryFn: fetchApprovedTestimonials,
    staleTime: 60_000,
  });

  const cards: Card[] = [
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

  return (
    <>
      <StaggerGroup className="grid gap-6 md:grid-cols-2">
        {cards.map((item, index) => (
          <motion.figure
            key={item.key}
            variants={staggerItem}
            whileHover={{ y: -6, rotate: 0 }}
            className={`relative flex h-full flex-col rounded-[2.5rem] bg-card p-8 pt-10 shadow-card transition-all ${
              index % 2 === 0 ? "md:-rotate-1" : "md:rotate-1"
            }`}
          >
            <span className="absolute -top-6 start-8 grid size-14 place-items-center rounded-2xl gradient-gold shadow-card">
              <Quote className="size-6 text-gold-foreground" />
            </span>
            <blockquote className="mt-4 flex-1 text-base leading-relaxed text-foreground/85">
              {item.quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-dashed border-border pt-5">
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
        ))}
      </StaggerGroup>
      <ShareForm />
    </>
  );
}
