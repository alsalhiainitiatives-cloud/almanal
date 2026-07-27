import {
  Archive,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gavel,
  HeartHandshake,
  Hourglass,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------- Stepper ------------------------- */

const STEPS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "draft", label: "إنشاء الطلب", icon: ClipboardList },
  { key: "submitted", label: "الإرسال", icon: Send },
  { key: "under_review", label: "المراجعة", icon: UserCheck },
  { key: "principal_review", label: "قرار الإدارة", icon: Gavel },
  { key: "approved", label: "النتيجة", icon: BadgeCheck },
];

const STEP_INDEX: Record<string, number> = {
  draft: 0,
  submitted: 1,
  needs_action: 1,
  under_review: 2,
  waitlisted: 2,
  principal_review: 3,
  approved: 4,
  rejected: 4,
  withdrawn: 4,
};

export function ApplicationStepper({ status }: { status: string }) {
  const active = STEP_INDEX[status] ?? 0;
  const terminated = status === "withdrawn" || status === "rejected";

  return (
    <ol className="flex flex-wrap items-start gap-y-4">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        const Icon =
          current && terminated ? (status === "withdrawn" ? Archive : XCircle) : step.icon;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-2xl border transition-colors",
                  done && "border-transparent bg-primary/10 text-primary",
                  current && !terminated && "border-transparent gradient-burgundy text-primary-foreground shadow-soft",
                  current && terminated && "border-transparent bg-destructive/15 text-destructive",
                  !done && !current && "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={cn(
                  "text-[11px] font-black leading-tight",
                  current ? "text-foreground" : done ? "text-primary" : "text-muted-foreground",
                )}
              >
                {current && terminated
                  ? status === "withdrawn"
                    ? "تم الإلغاء"
                    : "غير مقبول"
                  : step.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span
                className={cn(
                  "mb-6 h-1 flex-1 rounded-full",
                  i < active ? "bg-primary/40" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------- Timeline ------------------------- */

type EventVisual = { icon: LucideIcon; tone: string; ring: string };

function visualFor(eventType: string): EventVisual {
  const t = eventType.toLowerCase();
  if (t.includes("withdraw") || t.includes("cancel"))
    return { icon: Archive, tone: "bg-muted text-muted-foreground", ring: "ring-muted" };
  if (t.includes("reject") || t.includes("declin"))
    return { icon: XCircle, tone: "bg-destructive/15 text-destructive", ring: "ring-destructive/20" };
  if (t.includes("approve") || t.includes("accept"))
    return { icon: CheckCircle2, tone: "bg-mint text-foreground", ring: "ring-mint" };
  if (t.includes("submit"))
    return { icon: Send, tone: "gradient-burgundy text-primary-foreground", ring: "ring-primary/20" };
  if (t.includes("document") || t.includes("doc"))
    return { icon: FileText, tone: "bg-sky/70 text-foreground", ring: "ring-sky" };
  if (t.includes("qurra"))
    return { icon: HeartHandshake, tone: "bg-gold text-gold-foreground", ring: "ring-gold" };
  if (t.includes("seat") || t.includes("waitlist") || t.includes("waiting"))
    return { icon: CalendarClock, tone: "bg-beige text-foreground", ring: "ring-beige" };
  if (t.includes("review") || t.includes("assign"))
    return { icon: UserCheck, tone: "bg-primary/10 text-primary", ring: "ring-primary/15" };
  if (t.includes("action") || t.includes("request"))
    return { icon: ShieldAlert, tone: "bg-destructive/10 text-destructive", ring: "ring-destructive/15" };
  if (t.includes("created") || t.includes("draft"))
    return { icon: Sparkles, tone: "bg-beige text-foreground", ring: "ring-beige" };
  return { icon: Hourglass, tone: "bg-muted text-foreground", ring: "ring-border" };
}

export type JourneyEvent = {
  id: string;
  event_type: string;
  title_ar: string;
  body_ar: string | null;
  created_at: string;
};

export function ApplicationTimeline({ events }: { events: JourneyEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-2xl bg-beige/60 p-5 text-sm text-muted-foreground">
        لا توجد أحداث بعد — ستظهر هنا كل خطوة يتم اتخاذها على طلبك.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4">
      <span className="absolute inset-y-2 start-5 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
      {events.map((e) => {
        const v = visualFor(e.event_type);
        const Icon = v.icon;
        return (
          <li key={e.id} className="print-avoid-break relative flex gap-4">
            <span
              className={cn(
                "relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl ring-4 ring-card",
                v.tone,
              )}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 rounded-2xl bg-beige/50 px-4 py-3">
              <p className="text-sm font-black text-foreground">{e.title_ar}</p>
              {e.body_ar ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.body_ar}</p>
              ) : null}
              <p className="mt-2 text-[11px] font-bold text-muted-foreground" dir="auto">
                {new Date(e.created_at).toLocaleString("ar-SA", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
