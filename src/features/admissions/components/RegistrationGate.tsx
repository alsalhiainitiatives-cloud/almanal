import { Link } from "@tanstack/react-router";
import { CalendarX2, Info, Lock, Wrench, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSiteContent } from "@/features/site-content/SiteContentProvider";

/** Reads the admin-controlled registration switch. */
export function useRegistrationGate() {
  const { admissions } = useSiteContent();
  return {
    open: admissions.registrationOpen !== false,
    title: admissions.closureTitle || "التسجيل مغلق حالياً",
    message: admissions.closureMessage,
    reason: admissions.closureReason,
  };
}

const ICONS = {
  capacity: Lock,
  period_ended: CalendarX2,
  maintenance: Wrench,
  technical: TriangleAlert,
  custom: Info,
} as const;

/** Professional full-width closure notice shown at every registration entry point. */
export function RegistrationClosedNotice({ compact = false }: { compact?: boolean }) {
  const gate = useRegistrationGate();
  const Icon = ICONS[gate.reason] ?? Info;

  return (
    <div
      className={`rounded-[2rem] border-2 border-gold/50 bg-gold/15 text-center shadow-soft ${
        compact ? "p-6" : "p-8 sm:p-10"
      }`}
    >
      <span className="mx-auto grid size-16 place-items-center rounded-3xl gradient-burgundy text-primary-foreground">
        <Icon className="size-7" />
      </span>
      <h2 className={`mt-5 font-black text-foreground ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {gate.title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 font-semibold text-foreground/80">
        {gate.message}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild variant="hero" className="rounded-2xl">
          <Link to="/contact">تواصل مع إدارة الروضة</Link>
        </Button>
        <Button asChild variant="soft" className="rounded-2xl">
          <Link to="/admissions">استعراض المراحل التعليمية</Link>
        </Button>
      </div>
    </div>
  );
}
