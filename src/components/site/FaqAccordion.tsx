import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/data/site";

export function FaqAccordion({ limit }: { limit?: number }) {
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {items.map((item, index) => (
        <AccordionItem
          key={item.q}
          value={`item-${index}`}
          className="overflow-hidden rounded-3xl border border-border/60 bg-card px-6 shadow-soft"
        >
          <AccordionTrigger className="py-5 text-start text-base font-bold text-foreground hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}