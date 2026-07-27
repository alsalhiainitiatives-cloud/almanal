import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS } from "@/features/admissions/eligibility";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "../roles";

export const STATUS_LABELS: Record<string, string> = {
  ...APPLICATION_STATUS_LABELS,
  principal_review: "بانتظار اعتماد المدير",
  waitlisted: "قائمة الانتظار",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky/70 text-foreground",
  under_review: "bg-gold/80 text-gold-foreground",
  needs_action: "bg-destructive/12 text-destructive",
  principal_review: "bg-lavender/80 text-foreground",
  waitlisted: "bg-beige text-foreground",
  approved: "bg-mint text-foreground",
  rejected: "bg-destructive/12 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
        STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        PRIORITY_COLORS[priority] ?? "bg-muted text-muted-foreground",
      )}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

export function Tone({
  tone,
  children,
  className,
}: {
  tone: "green" | "yellow" | "red" | "neutral";
  children: ReactNode;
  className?: string;
}) {
  const map = {
    green: "bg-mint/70 text-foreground border-mint",
    yellow: "bg-gold/25 text-foreground border-gold/50",
    red: "bg-destructive/10 text-destructive border-destructive/30",
    neutral: "bg-muted text-muted-foreground border-border/60",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold", map[tone], className)}>
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-card/50 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</span>
      <p className="text-sm font-extrabold text-foreground">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/60" />
      ))}
    </div>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

export function money(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("ar-SA")} ر.س`;
}