import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

export function FaqAccordion({ limit }: { limit?: number }) {
  const { faqs } = useSiteContent();
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {items.map((item, index) => (
        <AccordionItem
          key={item.q}
          value={`item-${index}`}
          className="group overflow-hidden rounded-[1.75rem] border border-border/60 bg-card px-6 shadow-soft transition-all duration-400 hover:border-gold/50 hover:shadow-card data-[state=open]:border-gold/60 data-[state=open]:shadow-card"
        >
          <AccordionTrigger className="py-5 text-start text-base font-bold text-foreground hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="font-latin text-xs font-black text-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.q}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-5 ps-8 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}