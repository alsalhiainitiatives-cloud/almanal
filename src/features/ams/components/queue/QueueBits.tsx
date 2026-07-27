import { AlertTriangle, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { ageInDays, docsPercent, initialsOf, slaTone } from "../../queue-view";
import type { QueueRow } from "../../types";

const SLA_STYLES = {
  green: "bg-mint/60 text-foreground",
  yellow: "bg-gold/30 text-foreground",
  red: "bg-destructive/12 text-destructive",
} as const;

export function SlaChip({ row }: { row: QueueRow }) {
  const tone = slaTone(row);
  const days = ageInDays(row);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold whitespace-nowrap",
        SLA_STYLES[tone],
      )}
      title="مدة بقاء الطلب في القائمة"
    >
      {tone === "red" ? <AlertTriangle className="size-3" /> : <Clock3 className="size-3" />}
      {days === 0 ? "اليوم" : `${days} يوم`}
    </span>
  );
}

export function DocsMeter({ row, className }: { row: QueueRow; className?: string }) {
  const percent = docsPercent(row);
  const tone = percent === 100 ? "bg-mint" : percent >= 50 ? "bg-gold" : "bg-destructive/60";
  return (
    <div className={cn("min-w-24", className)}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-extrabold text-muted-foreground">
        <span>
          {row.documentsApproved}/{row.documentsTotal || 0}
        </span>
        {row.documentsRejected > 0 ? (
          <span className="text-destructive">{row.documentsRejected} مرفوض</span>
        ) : (
          <span>{percent}%</span>
        )}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-[11px] font-black text-primary",
        className,
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}