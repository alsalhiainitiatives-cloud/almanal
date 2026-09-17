import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

/** Premium FAQ list shared by the home preview and the /faq page. */
export function FaqAccordion({ limit }: { limit?: number }) {
  const { faqs } = useSiteContent();
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {items.map((item, index) => (
        <AccordionItem
          key={item.q}
          value={`item-${index}`}
          className="premium-card group overflow-hidden rounded-[1.85rem] px-6 data-[state=open]:border-gold/60 data-[state=open]:shadow-glow"
        >
          <AccordionTrigger className="py-5 text-start text-base font-bold text-foreground hover:no-underline [&>svg]:text-gold">
            <span className="flex items-center gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent font-latin text-xs font-black text-secondary transition-all duration-500 group-hover:gradient-gold group-hover:text-gold-foreground group-data-[state=open]:gradient-gold group-data-[state=open]:text-gold-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="leading-snug">{item.q}</span>
            </span>
          </AccordionTrigger>
          {/* The accordion panel only mounts while open, so the same answer text
              is also rendered (visually hidden) to keep it in the initial HTML
              for crawlers. Wording is identical — nothing is added or changed. */}
          <p className="sr-only">{item.a}</p>
          <AccordionContent className="pb-6 ps-13 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="mb-4 block h-px w-full gradient-gold-hairline opacity-70" />
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
