import { Bus, Check, Package, Shirt, Utensils } from "lucide-react";

import { cn } from "@/lib/utils";

type Service = {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string | null;
  price: number;
  price_note: string | null;
  is_required: boolean;
  category: string;
};

const icons: Record<string, typeof Bus> = {
  transport: Bus,
  meals: Utensils,
  uniform: Shirt,
  supplies: Package,
};

export function ServicesStep({
  services,
  selected,
  onToggle,
}: {
  services: Service[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {services.map((s) => {
        const Icon = icons[s.category] ?? Package;
        const active = s.is_required || selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={s.is_required}
            onClick={() => onToggle(s.id)}
            className={cn(
              "relative rounded-[2rem] border-2 p-6 text-start shadow-soft transition",
              active
                ? "border-primary bg-card"
                : "border-transparent bg-card hover:-translate-y-1 hover:shadow-card",
              s.is_required && "opacity-90",
            )}
          >
            {active ? (
              <span className="absolute top-5 end-5 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-4" />
              </span>
            ) : null}
            <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
              <Icon className="size-5" />
            </span>
            <p className="mt-4 font-black text-foreground">{s.name_ar}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description_ar}</p>
            <p className="mt-4 text-sm font-black text-primary">
              {Number(s.price) > 0 ? `${Number(s.price).toLocaleString("ar-SA")} ر.س` : "مجاني"}
              {s.price_note ? (
                <span className="ms-2 text-xs font-bold text-muted-foreground">{s.price_note}</span>
              ) : null}
            </p>
            {s.is_required ? (
              <p className="mt-2 text-xs font-bold text-secondary">خدمة إلزامية</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}